//! Positions as editors count them: zero-based lines and UTF-16 columns.

/// Byte offset of a UTF-16 `column` in `line`, clamped to the end of the line.
pub fn byte_of_column(line: &str, column: u32) -> usize {
    let mut units = 0u32;
    for (index, c) in line.char_indices() {
        if units >= column {
            return index;
        }
        units += c.len_utf16() as u32;
    }
    line.len()
}

/// UTF-16 column of a byte offset in `line`.
pub fn column_of_byte(line: &str, byte: usize) -> u32 {
    let byte = byte.min(line.len());
    let mut end = byte;
    while !line.is_char_boundary(end) {
        end -= 1;
    }
    line[..end].encode_utf16().count() as u32
}

/// Byte offset of the start of `line` (zero-based) in `text`.
pub fn line_start(text: &str, line: u32) -> usize {
    if line == 0 {
        return 0;
    }
    let mut seen = 0;
    for (index, byte) in text.bytes().enumerate() {
        if byte == b'\n' {
            seen += 1;
            if seen == line {
                return index + 1;
            }
        }
    }
    text.len()
}

/// Byte offset of a `(line, utf16 column)` position in `text`.
pub fn offset_at(text: &str, line: u32, column: u32) -> usize {
    let start = line_start(text, line);
    let rest = &text[start..];
    let line_text = rest.split('\n').next().unwrap_or("");
    start + byte_of_column(line_text, column)
}

/// One line of `text` without its line break.
pub fn line_text(text: &str, line: u32) -> &str {
    let start = line_start(text, line);
    let rest = &text[start..];
    let end = rest.find('\n').unwrap_or(rest.len());
    rest[..end].strip_suffix('\r').unwrap_or(&rest[..end])
}

/// Position of the end of `text`, which is what replaces a whole document.
pub fn end_position(text: &str) -> (u32, u32) {
    let lines: Vec<&str> = text.split('\n').collect();
    let last = lines.last().copied().unwrap_or("");
    ((lines.len() - 1) as u32, last.encode_utf16().count() as u32)
}
