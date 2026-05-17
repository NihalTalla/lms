function lexer(code) {
  const tokens = [];
  const indentStack = [0];
  let i = 0;
  let line = 1;
  let col = 1;

  const isDigit = c => /[0-9]/.test(c);
  const isAlpha = c => /[a-zA-Z_]/.test(c);
  const isAlnum = c => /[a-zA-Z0-9_]/.test(c);

  const keywords = [
    'print', 'print_inline',
    'if', 'elif', 'else',
    'while', 'for', 'in', 'range',
    'break', 'continue',
    'and', 'or', 'not',
    'True', 'False',
    'def', 'return','pass','global','nonlocal',
    'try', 'except', 'finally', 'raise', 'assert', 'as',
    'class'
  ];

  while (i < code.length) {
    const c = code[i];

    // ❌ tabs not allowed
    if (c === '\t') throw new Error('Tabs not allowed');
    // ---------- COMMENT ----------
if (c === '#') {
  // skip everything until newline
  while (i < code.length && code[i] !== '\n') {
    i++;
    col++;
  }
  continue;
}

    // ---------- NEWLINE + INDENT ----------
    if (c === '\n') {
      tokens.push({ type: 'NEWLINE', line, col });
      i++;
      line++;
      col = 1;

      let spaces = 0;
      while (code[i] === ' ') {
        spaces++;
        i++;
        col++;
      }

      // Python-like behavior: blank lines and comment-only lines DO NOT affect indentation.
      // If the next non-space char is '\n' (blank line) or '#'(comment line), skip indent/dedent.
      const nextChar = code[i];
      if (nextChar === '\n' || nextChar === '#' || nextChar === '\r' || nextChar === undefined) {
        continue;
      }

      const curr = indentStack[indentStack.length - 1];
      if (spaces > curr) {
        indentStack.push(spaces);
        tokens.push({ type: 'INDENT', line, col });
      } else {
        while (spaces < indentStack[indentStack.length - 1]) {
          indentStack.pop();
          tokens.push({ type: 'DEDENT', line, col });
        }
      }
      continue;
    }

    // ---------- WHITESPACE ----------
    if (c === ' ' || c === '\r') {
      i++;
      col++;
      continue;
    }

    // ---------- STRING LITERAL (v0.3) ----------
    if (c === '"') {
      i++; // skip opening quote
      col++;
      let str = '';

      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\n') {
          throw new Error('Unterminated string literal');
        }
        str += code[i++];
        col++;
      }

      if (code[i] !== '"') {
        throw new Error('Unterminated string literal');
      }

      i++; // skip closing quote
      col++;
      tokens.push({ type: 'STRING', value: str, line, col });
      continue;
    }

    // ---------- NUMBER ----------
    if (isDigit(c)) {
      let num = '';
      while (isDigit(code[i])) {
        num += code[i++];
        col++;
      }
      // Handle decimal point
      if (code[i] === '.') {
        num += code[i++];
        col++;
        while (isDigit(code[i])) {
          num += code[i++];
          col++;
        }
      }
      tokens.push({ type: 'NUMBER', value: Number(num), line, col });
      continue;
    }

    // ---------- IDENTIFIER / KEYWORD ----------
    if (isAlpha(c)) {
      let word = '';
      while (isAlnum(code[i])) {
        word += code[i++];
        col++;
      }

      if (keywords.includes(word)) {
        tokens.push({ type: word.toUpperCase(), line, col });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: word, line, col });
      }
      continue;
    }

    // ---------- TWO-CHAR OPERATORS ----------
    const two = code.substr(i, 2);
    if (['==', '!=', '<=', '>=', '//'].includes(two)) {
      tokens.push({ type: two, line, col });
      i += 2;
      col += 2;
      continue;
    }

    // ---------- SINGLE-CHAR TOKENS ----------
    const single = [
      '+', '-', '*', '/', '%',
      '(', ')', '=', ':',
      '>', '<', '[', ']', ',', '.', '{', '}'
    ];

    if (single.includes(c)) {
      tokens.push({ type: c, line, col });
      i++;
      col++;
      continue;
    }

    // ---------- ERROR ----------
    throw new Error(`Unexpected char ${c}`);
  }

  // ---------- FINAL DEDENTS ----------
  while (indentStack.length > 1) {
    indentStack.pop();
    tokens.push({ type: 'DEDENT', line, col });
  }

  return tokens;
}

module.exports = lexer;
