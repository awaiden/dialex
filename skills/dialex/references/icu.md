# ICU MessageFormat Reference

Dialex provides built-in compilation and parsing for ICU MessageFormat strings.

## Plurals

Plural format syntax:

```icu
{count, plural,
  =0 {No notifications}
  one {# notification}
  other {# notifications}
}
```

Rules:

- `#` is replaced with the formatted number variable (`count`).
- Exact matches like `=0` or `=1` take precedence over category keywords.
- Always include the `other` branch.

## Select

Select format for categorical strings:

```icu
{gender, select,
  male {He updated his profile}
  female {She updated her profile}
  other {They updated their profile}
}
```

## Nested Patterns

You can nest select and plural expressions:

```icu
{gender, select,
  female {{count, plural, one {She invited one friend} other {She invited # friends}}}
  other {{count, plural, one {They invited one friend} other {They invited # friends}}}
}
```

## Consistency Rule

When using ICU messages across multiple locales in Dialex:

- Every locale for a given key MUST accept the exact same set of variable placeholders (`count`, `gender`, etc.).
- `dialex check` and `dialex import` automatically reject messages that miss or rename arguments compared to the default locale.
