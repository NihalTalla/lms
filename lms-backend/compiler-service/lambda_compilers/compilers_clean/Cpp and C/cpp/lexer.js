// cpp/lexer.js
const T = require("./tokens");
const { CompileError } = require("./errors");

function lex(input) {
  let i = 0;
  let line = 1;
  let col = 1;

  const tokens = [];

  const peek = (k = 0) => input[i + k] ?? "\0";

  function advance() {
    const ch = input[i++] ?? "\0";
    if (ch === "\n") {
      line += 1;
      col = 1;
    } else {
      col += 1;
    }
    return ch;
  }

  function tok(type, value, startLine, startCol) {
    const t = { type, line: startLine, col: startCol };
    if (value !== undefined) t.value = value;
    return t;
  }

  function isAlpha(ch) { return /[A-Za-z_]/.test(ch); }
  function isAlnum(ch) { return /[A-Za-z0-9_]/.test(ch); }
  function isDigit(ch) { return /[0-9]/.test(ch); }

  function skipWhitespaceAndComments() {
    while (true) {
      const ch = peek();

      // whitespace
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        advance();
        continue;
      }

      // line comment //
      if (ch === "/" && peek(1) === "/") {
        while (peek() !== "\n" && peek() !== "\0") advance();
        continue;
      }

      // block comment /* ... */
      if (ch === "/" && peek(1) === "*") {
        const startLine = line, startCol = col;
        advance(); advance();
        while (!(peek() === "*" && peek(1) === "/")) {
          if (peek() === "\0") {
            throw new CompileError("Unterminated block comment", { line: startLine, col: startCol });
          }
          advance();
        }
        advance(); advance();
        continue;
      }

      break;
    }
  }

  const keywords = new Map([
    ["int", T.INT],
    ["float", T.FLOAT],
    ["bool", T.BOOL],
    ["void", T.VOID],
    ["return", T.RETURN],
    ["if", T.IF],
    ["else", T.ELSE],
    ["while", T.WHILE],
    ["for", T.FOR],
    ["namespace", T.NAMESPACE],
    ["struct", T.STRUCT],
    ["true", T.BOOL_LITERAL],
    ["false", T.BOOL_LITERAL],
    ["class", T.CLASS],
    ["this", T.THIS],
    ["list", T.LIST],
    ["string", T.STRING_KW],

    // v0.7 heap / pointers
    ["new", T.NEW],
    ["delete", T.DELETE],
    ["null", T.NULL],

    // v0.8 inheritance / virtual dispatch / qualifiers
    ["public", T.PUBLIC],
    ["private", T.PRIVATE],
    ["protected", T.PROTECTED],
    ["virtual", T.VIRTUAL],
    ["override", T.OVERRIDE],
    ["const", T.CONST],
    ["readonly", T.READONLY],

    // exceptions
    ["try", T.TRY],
    ["catch", T.CATCH],
    ["throw", T.THROW],

    // v1.0 templates
    ["template", T.TEMPLATE],
    ["typename", T.TYPENAME],
    ["import", T.IMPORT],
  ]);

  while (true) {
    skipWhitespaceAndComments();

    const ch = peek();
    const startLine = line;
    const startCol = col;

    if (ch === "\0") {
      tokens.push(tok(T.EOF, undefined, startLine, startCol));
      break;
    }

    // identifier / keyword
    if (isAlpha(ch)) {
      let s = "";
      while (isAlnum(peek())) s += advance();
      const kw = keywords.get(s);
      if (kw) {
        if (kw === T.BOOL_LITERAL) {
          tokens.push(tok(T.BOOL_LITERAL, s === "true", startLine, startCol));
        } else if (kw === T.NULL) {
          tokens.push(tok(T.NULL, null, startLine, startCol));
        } else {
          tokens.push(tok(kw, s, startLine, startCol));
        }
      } else {
        tokens.push(tok(T.IDENT, s, startLine, startCol));
      }
      continue;
    }

    // integer/float literal
    if (isDigit(ch)) {
      let num = "";
      while (isDigit(peek())) num += advance();

      if (peek() === "." && isDigit(peek(1))) {
        num += advance();
        while (isDigit(peek())) num += advance();

        // Optional float suffixes (f/F) are ignored.
        if (peek() === "f" || peek() === "F") advance();
        tokens.push(tok(T.FLOAT_LITERAL, parseFloat(num), startLine, startCol));
      } else {
        // Optional integer suffixes like U, L, LL, ULL are ignored.
        // This is needed for stdlib stubs (e.g. 9223372036854775807LL).
        while (/[uUlL]/.test(peek())) advance();
        tokens.push(tok(T.INT_LITERAL, parseInt(num, 10), startLine, startCol));
      }
      continue;
    }

    // string literal
    if (ch === '"') {
      advance();
      let s = "";
      while (peek() !== '"' && peek() !== "\0") {
        if (peek() === "\\") {
          advance();
          const esc = advance();
          if (esc === "n") s += "\n";
          else if (esc === "t") s += "\t";
          else if (esc === '"') s += '"';
          else if (esc === "\\") s += "\\";
          else throw new CompileError(`Invalid escape sequence \\${esc}`, { line: startLine, col: startCol });
        } else {
          s += advance();
        }
      }
      if (peek() !== '"') throw new CompileError("Unterminated string literal", { line: startLine, col: startCol });
      advance();
      tokens.push(tok(T.STRING_LITERAL, s, startLine, startCol));
      continue;
    }
        // char literal
    if (ch === "'") {
      advance(); // consume opening '

      let value;
      if (peek() === "\\") {
        advance(); // consume '\'
        const esc = advance();
        if (esc === "n") value = "\n";
        else if (esc === "t") value = "\t";
        else if (esc === "'") value = "'";
        else if (esc === "\\") value = "\\";
        else {
          throw new CompileError(`Invalid escape sequence \\${esc}`, {
            line: startLine,
            col: startCol,
          });
        }
      } else {
        value = advance();
      }

      if (peek() !== "'") {
        throw new CompileError("Unterminated character literal", {
          line: startLine,
          col: startCol,
        });
      }
      advance(); // consume closing '

      tokens.push(tok(T.CHAR_LITERAL, value, startLine, startCol));
      continue;
    }

    // three-char operators
    const three = ch + peek(1) + peek(2);
    if (three === "...") { advance(); advance(); advance(); tokens.push(tok(T.ELLIPSIS, "...", startLine, startCol)); continue; }

    // two-char operators
    const two = ch + peek(1);
    if (two === "::") { advance(); advance(); tokens.push(tok(T.SCOPE, "::", startLine, startCol)); continue; }
    if (two === "++") { advance(); advance(); tokens.push(tok(T.PLUSPLUS, "++", startLine, startCol)); continue; }
    if (two === "<<") { advance(); advance(); tokens.push(tok(T.SHL, "<<", startLine, startCol)); continue; }
    if (two === ">>") { advance(); advance(); tokens.push(tok(T.SHR, ">>", startLine, startCol)); continue; }
    if (two === "==") { advance(); advance(); tokens.push(tok(T.EQEQ, "==", startLine, startCol)); continue; }
    if (two === "!=") { advance(); advance(); tokens.push(tok(T.NEQ, "!=", startLine, startCol)); continue; }
    if (two === "<=") { advance(); advance(); tokens.push(tok(T.LE, "<=", startLine, startCol)); continue; }
    if (two === ">=") { advance(); advance(); tokens.push(tok(T.GE, ">=", startLine, startCol)); continue; }
    if (two === "&&") { advance(); advance(); tokens.push(tok(T.AND_AND, "&&", startLine, startCol)); continue; }
    if (two === "||") { advance(); advance(); tokens.push(tok(T.OR_OR, "||", startLine, startCol)); continue; }
    if (two === "->") { advance(); advance(); tokens.push(tok(T.ARROW, "->", startLine, startCol)); continue; }
    if (two === "::") { advance(); advance(); tokens.push(tok(T.SCOPE, "::", startLine, startCol)); continue; }
    if (two === "++") { advance(); advance(); tokens.push(tok(T.PLUSPLUS, "++", startLine, startCol)); continue; }

    // single-char tokens
    switch (ch) {
      case "(": advance(); tokens.push(tok(T.LPAREN, "(", startLine, startCol)); continue;
      case ")": advance(); tokens.push(tok(T.RPAREN, ")", startLine, startCol)); continue;
      case "{": advance(); tokens.push(tok(T.LBRACE, "{", startLine, startCol)); continue;
      case "}": advance(); tokens.push(tok(T.RBRACE, "}", startLine, startCol)); continue;
      case "[": advance(); tokens.push(tok(T.LBRACKET, "[", startLine, startCol)); continue;
      case "]": advance(); tokens.push(tok(T.RBRACKET, "]", startLine, startCol)); continue;
      case ";": advance(); tokens.push(tok(T.SEMICOLON, ";", startLine, startCol)); continue;
      case ",": advance(); tokens.push(tok(T.COMMA, ",", startLine, startCol)); continue;
      case ".": advance(); tokens.push(tok(T.DOT, ".", startLine, startCol)); continue;
      case "?": advance(); tokens.push(tok(T.QUESTION, "?", startLine, startCol)); continue;

      // v0.8 punctuation
      case ":": advance(); tokens.push(tok(T.COLON, ":", startLine, startCol)); continue;
      case "&": advance(); tokens.push(tok(T.AMP, "&", startLine, startCol)); continue;
      case "~": advance(); tokens.push(tok(T.TILDE, "~", startLine, startCol)); continue;

      case "=": advance(); tokens.push(tok(T.ASSIGN, "=", startLine, startCol)); continue;
      case "+": advance(); tokens.push(tok(T.PLUS, "+", startLine, startCol)); continue;
      case "-": advance(); tokens.push(tok(T.MINUS, "-", startLine, startCol)); continue;
      case "*": advance(); tokens.push(tok(T.STAR, "*", startLine, startCol)); continue;
      case "/": advance(); tokens.push(tok(T.SLASH, "/", startLine, startCol)); continue;
      case "%": advance(); tokens.push(tok(T.MOD, "%", startLine, startCol)); continue;

      case "<": advance(); tokens.push(tok(T.LT, "<", startLine, startCol)); continue;
      case ">": advance(); tokens.push(tok(T.GT, ">", startLine, startCol)); continue;
      case "!": advance(); tokens.push(tok(T.BANG, "!", startLine, startCol)); continue;
    }

    throw new CompileError(`Unexpected character '${ch}'`, { line: startLine, col: startCol });
  }

  return tokens;
}

module.exports = lex;
