use oxc_allocator::Allocator;
use oxc_ast::ast::{
    Argument, Expression, ObjectExpression, ObjectPropertyKind, PropertyKey, PropertyKind,
    Statement,
};
use oxc_parser::Parser;
use oxc_span::{GetSpan, SourceType};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LeafKind {
    String,
    Function,
    Other,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Leaf {
    pub path: Vec<String>,
    pub kind: LeafKind,
    /// The string, when `kind` is `String`.
    pub value: Option<String>,
    /// Byte offsets of the property key in the source.
    pub key_span: (u32, u32),
}

#[derive(Debug, Clone, PartialEq)]
pub struct Locale {
    pub name: String,
    /// Whether the locale's value is an object literal.
    pub is_object: bool,
    pub leaves: Vec<Leaf>,
    /// Byte offsets of the locale's property key.
    pub key_span: (u32, u32),
}

/// An object literal in the dictionary, with where its braces and members are in the source.
#[derive(Debug, Clone, PartialEq)]
pub struct Object {
    /// Byte offsets of the `{ ... }`.
    pub span: (u32, u32),
    pub members: Vec<Member>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Member {
    /// `...other`, which hides keys from the syntax tree.
    Spread {
        span: (u32, u32),
    },
    Property(Property),
}

#[derive(Debug, Clone, PartialEq)]
pub struct Property {
    /// The static name, `None` for computed keys.
    pub name: Option<String>,
    pub key_span: (u32, u32),
    /// The whole property, key and value.
    pub span: (u32, u32),
    pub value: Value,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Object(Object),
    Leaf {
        /// The value as written (for a method, the whole method).
        span: (u32, u32),
        kind: LeafKind,
        string: Option<String>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub struct Dictionary {
    /// The object whose keys are locales, with everything below it.
    pub root: Object,
    pub name: Option<String>,
    /// `false` when a spread, a computed key or a non-object locale makes the dictionary only
    /// partly readable.
    pub complete: bool,
    /// Every locale key in source order (duplicates kept, as `listLocales` does).
    pub locales: Vec<Locale>,
    /// Byte offsets of the object whose keys are locales.
    pub locales_span: (u32, u32),
}

impl Dictionary {
    pub fn locale_names(&self) -> Vec<String> {
        self.locales
            .iter()
            .map(|locale| locale.name.clone())
            .collect()
    }

    /// The first locale called `name`, as `findProp` finds it.
    pub fn locale(&self, name: &str) -> Option<&Locale> {
        self.locales.iter().find(|locale| locale.name == name)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub enum ParseError {
    /// The file has a syntax error; the caller falls back to the Node CLI for its message.
    Syntax(String),
    /// Something the port does not model, such as an exponent in a numeric key.
    Unsupported(String),
}

fn unwrap<'a, 'b>(mut expression: &'b Expression<'a>) -> &'b Expression<'a> {
    loop {
        expression = match expression {
            Expression::TSAsExpression(inner) => &inner.expression,
            Expression::TSSatisfiesExpression(inner) => &inner.expression,
            Expression::ParenthesizedExpression(inner) => &inner.expression,
            _ => return expression,
        };
    }
}

/// `String(number)` for the cases that show up as object keys.
fn number_key(value: f64) -> Result<String, ParseError> {
    if !value.is_finite() || value.abs() >= 1e21 || (value != 0.0 && value.abs() < 1e-6) {
        return Err(ParseError::Unsupported(format!("numeric key {value}")));
    }
    if value == value.trunc() {
        Ok(format!("{}", value as i64))
    } else {
        Ok(format!("{value}"))
    }
}

/// The static name of a property key, or `None` for computed and unusual keys.
fn key_name(key: &PropertyKey, computed: bool) -> Result<Option<String>, ParseError> {
    if computed {
        return Ok(None);
    }
    Ok(match key {
        PropertyKey::StaticIdentifier(identifier) => Some(identifier.name.to_string()),
        PropertyKey::StringLiteral(literal) => Some(literal.value.to_string()),
        PropertyKey::NumericLiteral(literal) => Some(number_key(literal.value)?),
        _ => None,
    })
}

fn string_value(expression: &Expression) -> Option<String> {
    match unwrap(expression) {
        Expression::StringLiteral(literal) => Some(literal.value.to_string()),
        Expression::TemplateLiteral(template) if template.expressions.is_empty() => template
            .quasis
            .first()
            .and_then(|quasi| quasi.value.cooked.as_ref())
            .map(|s| s.to_string()),
        _ => None,
    }
}

fn is_function(expression: &Expression) -> bool {
    matches!(
        unwrap(expression),
        Expression::ArrowFunctionExpression(_) | Expression::FunctionExpression(_)
    )
}

fn object_of<'a, 'b>(expression: &'b Expression<'a>) -> Option<&'b ObjectExpression<'a>> {
    match unwrap(expression) {
        Expression::ObjectExpression(object) => Some(object),
        _ => None,
    }
}

/// A property of an object literal with its static key, skipping spreads.
struct Prop<'a, 'b> {
    name: Option<String>,
    value: &'b Expression<'a>,
    /// A method, getter or setter, which Babel reports as `ObjectMethod`.
    is_method: bool,
    key_span: (u32, u32),
}

fn props<'a, 'b>(object: &'b ObjectExpression<'a>) -> Result<Vec<Prop<'a, 'b>>, ParseError> {
    let mut result = Vec::new();
    for property in &object.properties {
        if let ObjectPropertyKind::ObjectProperty(property) = property {
            let span = property.key.span();
            result.push(Prop {
                name: key_name(&property.key, property.computed)?,
                value: &property.value,
                is_method: property.method || property.kind != PropertyKind::Init,
                key_span: (span.start, span.end),
            });
        }
    }
    Ok(result)
}

fn has_spread(object: &ObjectExpression) -> bool {
    object
        .properties
        .iter()
        .any(|property| matches!(property, ObjectPropertyKind::SpreadProperty(_)))
}

/// Every object on the way down is free of spreads and computed keys.
fn walk_complete(object: &ObjectExpression) -> Result<bool, ParseError> {
    if has_spread(object) {
        return Ok(false);
    }
    for prop in props(object)? {
        if prop.name.is_none() {
            return Ok(false);
        }
        if prop.is_method {
            continue;
        }
        if let Some(inner) = object_of(prop.value) {
            if !walk_complete(inner)? {
                return Ok(false);
            }
        }
    }
    Ok(true)
}

fn is_complete(locales: &ObjectExpression) -> Result<bool, ParseError> {
    if has_spread(locales) {
        return Ok(false);
    }
    for prop in props(locales)? {
        if prop.name.is_none() || prop.is_method {
            return Ok(false);
        }
        match object_of(prop.value) {
            Some(object) => {
                if !walk_complete(object)? {
                    return Ok(false);
                }
            }
            None => return Ok(false),
        }
    }
    Ok(true)
}

fn object_tree(object: &ObjectExpression) -> Result<Object, ParseError> {
    let mut members = Vec::new();
    for property in &object.properties {
        match property {
            ObjectPropertyKind::SpreadProperty(spread) => {
                members.push(Member::Spread {
                    span: (spread.span.start, spread.span.end),
                });
            }
            ObjectPropertyKind::ObjectProperty(property) => {
                let key = property.key.span();
                let is_method = property.method || property.kind != PropertyKind::Init;
                let value = if is_method {
                    let span = property.span;
                    Value::Leaf {
                        span: (span.start, span.end),
                        kind: LeafKind::Function,
                        string: None,
                    }
                } else if let Some(inner) = object_of(&property.value) {
                    Value::Object(object_tree(inner)?)
                } else {
                    let span = property.value.span();
                    let (kind, string) = if let Some(text) = string_value(&property.value) {
                        (LeafKind::String, Some(text))
                    } else if is_function(&property.value) {
                        (LeafKind::Function, None)
                    } else {
                        (LeafKind::Other, None)
                    };
                    Value::Leaf {
                        span: (span.start, span.end),
                        kind,
                        string,
                    }
                };
                members.push(Member::Property(Property {
                    name: key_name(&property.key, property.computed)?,
                    key_span: (key.start, key.end),
                    span: (property.span.start, property.span.end),
                    value,
                }));
            }
        }
    }
    Ok(Object {
        span: (object.span.start, object.span.end),
        members,
    })
}

fn collect_leaves(
    object: &ObjectExpression,
    prefix: &mut Vec<String>,
    leaves: &mut Vec<Leaf>,
) -> Result<(), ParseError> {
    for prop in props(object)? {
        let Some(name) = prop.name else { continue };
        prefix.push(name);
        if !prop.is_method {
            if let Some(inner) = object_of(prop.value) {
                collect_leaves(inner, prefix, leaves)?;
                prefix.pop();
                continue;
            }
        }
        let (kind, value) = if prop.is_method {
            (LeafKind::Function, None)
        } else if let Some(text) = string_value(prop.value) {
            (LeafKind::String, Some(text))
        } else if is_function(prop.value) {
            (LeafKind::Function, None)
        } else {
            (LeafKind::Other, None)
        };
        leaves.push(Leaf {
            path: prefix.clone(),
            kind,
            value,
            key_span: prop.key_span,
        });
        prefix.pop();
    }
    Ok(())
}

/// The name from `defineDictionary("name", ...)`, `defineDictionary({ name })` or `{ name }`.
fn locate_name(declaration: &Expression) -> Result<Option<String>, ParseError> {
    let find_name = |object: &ObjectExpression| -> Result<Option<String>, ParseError> {
        for prop in props(object)? {
            if prop.name.as_deref() == Some("name") {
                return Ok(string_value(prop.value));
            }
        }
        Ok(None)
    };

    match unwrap(declaration) {
        Expression::CallExpression(call) => {
            match call.arguments.first().and_then(Argument::as_expression) {
                Some(first) => match object_of(first) {
                    Some(object) => find_name(object),
                    None => Ok(string_value(first)),
                },
                None => Ok(None),
            }
        }
        Expression::ObjectExpression(object) => find_name(object),
        _ => Ok(None),
    }
}

fn dictionary_prop<'a, 'b>(
    object: &'b ObjectExpression<'a>,
) -> Result<Option<&'b ObjectExpression<'a>>, ParseError> {
    for prop in props(object)? {
        if prop.name.as_deref() == Some("dictionary") {
            return Ok(object_of(prop.value));
        }
    }
    Ok(None)
}

fn locate_locales<'a, 'b>(
    declaration: &'b Expression<'a>,
) -> Result<Option<&'b ObjectExpression<'a>>, ParseError> {
    match unwrap(declaration) {
        Expression::CallExpression(call) => {
            let first = call.arguments.first().and_then(Argument::as_expression);
            let second = call.arguments.get(1).and_then(Argument::as_expression);
            if let Some(object) = second.and_then(object_of) {
                return Ok(Some(object));
            }
            match first.and_then(object_of) {
                Some(object) => dictionary_prop(object),
                None => Ok(None),
            }
        }
        Expression::ObjectExpression(object) => dictionary_prop(object),
        _ => Ok(None),
    }
}

/// Parses a dictionary file. `Ok(None)` means the file has no editable shape, as
/// `parseDictionaryText` returning `undefined` does.
pub fn parse_dictionary(file_name: &str, source: &str) -> Result<Option<Dictionary>, ParseError> {
    let allocator = Allocator::default();
    let source_type = SourceType::from_path(file_name).unwrap_or_else(|_| SourceType::ts());
    let parsed = Parser::new(&allocator, source, source_type).parse();
    if parsed.fatal_error || parsed.diagnostics.has_errors() {
        let message = parsed
            .diagnostics
            .errors()
            .next()
            .map(|e| e.to_string())
            .unwrap_or_default();
        return Err(ParseError::Syntax(message));
    }

    let declaration = parsed
        .program
        .body
        .iter()
        .find_map(|statement| match statement {
            Statement::ExportDefaultDeclaration(export) => export.declaration.as_expression(),
            _ => None,
        });
    let Some(declaration) = declaration else {
        return Ok(None);
    };

    let Some(locales_object) = locate_locales(declaration)? else {
        return Ok(None);
    };
    let name = locate_name(declaration)?;
    let complete = is_complete(locales_object)?;

    let mut locales = Vec::new();
    for prop in props(locales_object)? {
        let Some(locale_name) = prop.name else {
            continue;
        };
        let mut leaves = Vec::new();
        let mut is_object = false;
        if !prop.is_method {
            if let Some(object) = object_of(prop.value) {
                is_object = true;
                collect_leaves(object, &mut Vec::new(), &mut leaves)?;
            }
        }
        locales.push(Locale {
            name: locale_name,
            is_object,
            leaves,
            key_span: prop.key_span,
        });
    }

    let span = locales_object.span;
    let root = object_tree(locales_object)?;
    Ok(Some(Dictionary {
        root,
        name,
        complete,
        locales,
        locales_span: (span.start, span.end),
    }))
}
