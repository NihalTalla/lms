// compiler/c/lexer.js
// C lexer: converts source text into a token stream

const {
  TokenKind,
  Keywords,
  SingleCharTokens,
  TwoCharTokens,
  ThreeCharTokens,
} = require("./tokens");

// ------------------------------
// Token object
// ------------------------------
class Token {
  constructor(kind, value, line, column) {
    this.kind = kind;
    this.value = value;
    this.line = line;
    this.column = column;
  }
}

// ------------------------------
// Lexer
// ------------------------------
class Lexer {
  constructor(source) {
    this.source = source;
    this.length = source.length;
    this.pos = 0;
    this.line = 1;
    this.column = 1;
  }

  // -------- Utilities --------
  eof() {
    return this.pos >= this.length;
  }

  peek(n = 0) {
    return this.pos + n < this.length ? this.source[this.pos + n] : "\0";
  }

  advance() {
    const ch = this.source[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  match(str) {
    for (let i = 0; i < str.length; i++) {
      if (this.peek(i) !== str[i]) return false;
    }
    return true;
  }

  // -------- Skipping --------
  skipWhitespaceAndComments() {
    while (!this.eof()) {
      const ch = this.peek();

      // Whitespace
      if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") {
        this.advance();
        continue;
      }

      // Line comment //
      if (this.match("//")) {
        this.advance();
        this.advance();
        while (!this.eof() && this.peek() !== "\n") {
          this.advance();
        }
        continue;
      }

      // Block comment /* */
      if (this.match("/*")) {
        this.advance();
        this.advance();
        while (!this.eof() && !this.match("*/")) {
          this.advance();
        }
        if (!this.eof()) {
          this.advance();
          this.advance();
        }
        continue;
      }

      break;
    }
  }

  // -------- Token readers --------
  readIdentifierOrKeyword() {
    const startCol = this.column;
    let text = "";

    while (!this.eof()) {
      const ch = this.peek();
      if (
        (ch >= "a" && ch <= "z") ||
        (ch >= "A" && ch <= "Z") ||
        (ch >= "0" && ch <= "9") ||
        ch === "_"
      ) {
        text += this.advance();
      } else {
        break;
      }
    }

    const kind = Keywords[text] || TokenKind.IDENTIFIER;
    return new Token(kind, text, this.line, startCol);
  }

  readNumber() {
    const startCol = this.column;
    let text = "";
    let isFloat = false;
    let base = 10;

    // Check for binary (0b) or hex (0x) prefix
    if (this.peek() === "0") {
      text += this.advance();
      if (this.peek() === "b" || this.peek() === "B") {
        base = 2;
        text += this.advance();
      } else if (this.peek() === "x" || this.peek() === "X") {
        base = 16;
        text += this.advance();
      } else if (this.peek() >= "0" && this.peek() <= "7") {
        base = 8; // octal
      }
    }

    // Read digits based on base
    while (!this.eof()) {
      const ch = this.peek();
      if (base === 2) {
        if (ch === "0" || ch === "1") {
          text += this.advance();
        } else {
          break;
        }
      } else if (base === 16) {
        if ((ch >= "0" && ch <= "9") || (ch >= "a" && ch <= "f") || (ch >= "A" && ch <= "F")) {
          text += this.advance();
        } else {
          break;
        }
      } else if (base === 8) {
        if (ch >= "0" && ch <= "7") {
          text += this.advance();
        } else {
          break;
        }
      } else {
        // decimal
        if (ch >= "0" && ch <= "9") {
          text += this.advance();
        } else if (ch === "." && !isFloat) {
          isFloat = true;
          text += this.advance();
        } else {
          break;
        }
      }
    }

    // Read suffixes: u, U, l, L, ll, LL
    let suffix = "";
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === "u" || ch === "U" || ch === "l" || ch === "L") {
        suffix += this.advance();
        // Check for ll/LL
        if ((ch === "l" || ch === "L") && (this.peek() === "l" || this.peek() === "L")) {
          suffix += this.advance();
        }
      } else {
        break;
      }
    }

    // NOTE:
    // We normalize integer literal values to a decimal string here (strip base prefixes + suffixes),
    // so later stages (sema/irgen) can reliably do Number()/parseInt() without getting NaN.
    //
    // Type suffixes (u/l/ll) are currently consumed but not preserved; CP-grade tests mainly
    // need correct numeric values for operations.
    if (!isFloat) {
      let digits = text;
      if (base === 2 && (digits.startsWith("0b") || digits.startsWith("0B"))) digits = digits.slice(2);
      if (base === 16 && (digits.startsWith("0x") || digits.startsWith("0X"))) digits = digits.slice(2);
      const n = digits.length ? parseInt(digits, base) : 0;
      return new Token(TokenKind.INT_LITERAL, String(n), this.line, startCol);
    }

    return new Token(TokenKind.FLOAT_LITERAL, text, this.line, startCol);
  }

  readCharLiteral() {
    const startCol = this.column;
    this.advance(); // '

    let value = "";
    if (this.peek() === "\\") {
      value += this.advance();
      value += this.advance();
    } else {
      value += this.advance();
    }

    if (this.peek() !== "'") {
      throw new Error(
        `Unterminated char literal at ${this.line}:${this.column}`
      );
    }
    this.advance(); // '

    return new Token(TokenKind.CHAR_LITERAL, value, this.line, startCol);
  }

  readStringLiteral() {
    const startCol = this.column;
    this.advance(); // "

    let value = "";
    while (!this.eof() && this.peek() !== '"') {
      if (this.peek() === "\\") {
        value += this.advance();
        value += this.advance();
      } else {
        value += this.advance();
      }
    }

    if (this.peek() !== '"') {
      throw new Error(
        `Unterminated string literal at ${this.line}:${this.column}`
      );
    }
    this.advance(); // "

    return new Token(TokenKind.STRING_LITERAL, value, this.line, startCol);
  }

  // -------- Main entry --------
  nextToken() {
    this.skipWhitespaceAndComments();

    if (this.eof()) {
      return new Token(TokenKind.EOF, null, this.line, this.column);
    }

    const ch = this.peek();
    const startCol = this.column;

    // Identifiers / keywords
    if (
      (ch >= "a" && ch <= "z") ||
      (ch >= "A" && ch <= "Z") ||
      ch === "_"
    ) {
      return this.readIdentifierOrKeyword();
    }

    // Numbers
    if (ch >= "0" && ch <= "9") {
      return this.readNumber();
    }

    // Char literal
    if (ch === "'") {
      return this.readCharLiteral();
    }

    // String literal
    if (ch === '"') {
      return this.readStringLiteral();
    }

    // Two-character operators (check before single-character)
    // Need to check for 3-char tokens first (like <<=, >>=)
    const three = ch + this.peek(1) + this.peek(2);
    if (ThreeCharTokens && ThreeCharTokens[three]) {
      this.advance();
      this.advance();
      this.advance();
      return new Token(ThreeCharTokens[three], three, this.line, startCol);
    }
    
    const two = ch + this.peek(1);
    if (TwoCharTokens[two]) {
      this.advance();
      this.advance();
      return new Token(TwoCharTokens[two], two, this.line, startCol);
    }

    // Single-character operators / delimiters
    if (SingleCharTokens[ch]) {
      this.advance();
      return new Token(SingleCharTokens[ch], ch, this.line, startCol);
    }

    // Unknown character
    this.advance();
    return new Token(TokenKind.INVALID, ch, this.line, startCol);
  }

  // -------- Convenience --------
  tokenize() {
    const tokens = [];
    while (true) {
      const tok = this.nextToken();
      tokens.push(tok);
      if (tok.kind === TokenKind.EOF) break;
    }
    return tokens;
  }
}

// ------------------------------
// Exports
// ------------------------------
module.exports = {
  Token,
  Lexer,
};
