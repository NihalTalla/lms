const { TOKENS } = require("./tokens");

const KEYWORDS = {
  class: TOKENS.CLASS,
  enum: TOKENS.ENUM,              // v5.0: Enums
  public: TOKENS.PUBLIC,
  private: TOKENS.PRIVATE,
  static: TOKENS.STATIC,
  void: TOKENS.VOID,
  main: TOKENS.MAIN,
  int: TOKENS.INT,
  new: TOKENS.NEW,
  String: TOKENS.STRING_KW,
do: TOKENS.DO,

  System: TOKENS.SYSTEM,
  out: TOKENS.OUT,
  println: TOKENS.PRINTLN,
// v1.8 assertions
assert: TOKENS.ASSERT,
require: TOKENS.REQUIRE,
ensure: TOKENS.ENSURE,
check: TOKENS.CHECK,

  // control
  if: TOKENS.IF,
  else: TOKENS.ELSE,
  while: TOKENS.WHILE,
  for: TOKENS.FOR,
  return: TOKENS.RETURN,
switch: TOKENS.SWITCH,
case: TOKENS.CASE,
default: TOKENS.DEFAULT,
assert: TOKENS.ASSERT,
require: TOKENS.REQUIRE,
ensure: TOKENS.ENSURE,
check: TOKENS.CHECK,
trap: TOKENS.TRAP,

  // v0.8.1
  break: TOKENS.BREAK,
  continue: TOKENS.CONTINUE,

  // booleans
  true: TOKENS.TRUE,
  false: TOKENS.FALSE,
  // v2.7-v3.4
  extends: TOKENS.EXTENDS,
  super: TOKENS.SUPER,
  abstract: TOKENS.ABSTRACT,
  interface: TOKENS.INTERFACE,
  implements: TOKENS.IMPLEMENTS,
  package: TOKENS.PACKAGE,        // v8.0: Packages
  import: TOKENS.IMPORT,          // v8.1: Imports
  instanceof: TOKENS.INSTANCEOF   // v7.4: instanceof operator
};

function tokenize(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const c = input[i];

    /* ---------- WHITESPACE ---------- */
    if (/\s/.test(c)) {
      i++;
      continue;
    }

    /* ---------- COMMENTS ---------- */
    if (c === "/" && input[i + 1] === "/") {
      i += 2;
      while (i < input.length && input[i] !== "\n") i++;
      continue;
    }

    if (c === "/" && input[i + 1] === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) i++;
      if (i >= input.length) throw new Error("Unterminated multi-line comment");
      i += 2;
      continue;
    }

    /* ---------- NUMBERS ---------- */
    if (/\d/.test(c)) {
      let num = "";
      while (i < input.length && /\d/.test(input[i])) num += input[i++];
      tokens.push({ type: TOKENS.NUMBER, value: Number(num) });
      continue;
    }

    /* ---------- LOGICAL ---------- */
    if (c === "&" && input[i + 1] === "&") {
      tokens.push({ type: TOKENS.AND_AND });
      i += 2;
      continue;
    }

    if (c === "|" && input[i + 1] === "|") {
      tokens.push({ type: TOKENS.OR_OR });
      i += 2;
      continue;
    }

    /* ---------- COMPOUND SHIFT ASSIGNMENTS (v1.6) ---------- */
    if (c === "<" && input[i + 1] === "<" && input[i + 2] === "=") {
      tokens.push({ type: TOKENS.SHIFT_LEFT_ASSIGN });
      i += 3;
      continue;
    }

    if (c === ">" && input[i + 1] === ">" && input[i + 2] === "=") {
      tokens.push({ type: TOKENS.SHIFT_RIGHT_ASSIGN });
      i += 3;
      continue;
    }

    /* ---------- SHIFT OPERATORS (v1.4) ---------- */
    if (c === "<" && input[i + 1] === "<") {
      tokens.push({ type: TOKENS.SHIFT_LEFT });
      i += 2;
      continue;
    }

    if (c === ">" && input[i + 1] === ">") {
      tokens.push({ type: TOKENS.SHIFT_RIGHT });
      i += 2;
      continue;
    }

    /* ---------- RELATIONAL ---------- */
    if (c === ">" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.GE });
      i += 2;
      continue;
    }

    if (c === "<" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.LE });
      i += 2;
      continue;
    }

    if (c === ">") {
      tokens.push({ type: TOKENS.GT });
      i++;
      continue;
    }

    if (c === "<") {
      tokens.push({ type: TOKENS.LT });
      i++;
      continue;
    }

    /* ---------- EQUALITY ---------- */
    if (c === "=" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.EQ });
      i += 2;
      continue;
    }

    if (c === "!" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.NE });
      i += 2;
      continue;
    }

    /* ---------- INC / DEC (v1.5) ---------- */
    if (c === "+" && input[i + 1] === "+") {
      tokens.push({ type: TOKENS.INCREMENT });
      i += 2;
      continue;
    }

    if (c === "-" && input[i + 1] === "-") {
      tokens.push({ type: TOKENS.DECREMENT });
      i += 2;
      continue;
    }

    /* ---------- COMPOUND BITWISE ASSIGN (v1.6) ---------- */
    if (c === "&" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.BIT_AND_ASSIGN });
      i += 2;
      continue;
    }

    if (c === "|" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.BIT_OR_ASSIGN });
      i += 2;
      continue;
    }

    if (c === "^" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.BIT_XOR_ASSIGN });
      i += 2;
      continue;
    }

    /* ---------- BITWISE ---------- */
    if (c === "&") {
      tokens.push({ type: TOKENS.BIT_AND });
      i++;
      continue;
    }

    if (c === "|") {
      tokens.push({ type: TOKENS.BIT_OR });
      i++;
      continue;
    }

    if (c === "^") {
      tokens.push({ type: TOKENS.BIT_XOR });
      i++;
      continue;
    }

    if (c === "~") {
      tokens.push({ type: TOKENS.BIT_NOT });
      i++;
      continue;
    }

    /* ---------- ARITHMETIC ASSIGN ---------- */
    if (c === "+" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.PLUS_ASSIGN });
      i += 2;
      continue;
    }

    if (c === "-" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.MINUS_ASSIGN });
      i += 2;
      continue;
    }

    if (c === "*" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.STAR_ASSIGN });
      i += 2;
      continue;
    }

    if (c === "/" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.SLASH_ASSIGN });
      i += 2;
      continue;
    }

    if (c === "%" && input[i + 1] === "=") {
      tokens.push({ type: TOKENS.PERCENT_ASSIGN });
      i += 2;
      continue;
    }

    /* ---------- TERNARY ---------- */
    if (c === "?") {
      tokens.push({ type: TOKENS.QUESTION });
      i++;
      continue;
    }

    if (c === ":") {
      tokens.push({ type: TOKENS.COLON });
      i++;
      continue;
    }

    /* ---------- UNARY ---------- */
    if (c === "!") {
      tokens.push({ type: TOKENS.NOT });
      i++;
      continue;
    }

    /* ---------- IDENTIFIERS / KEYWORDS ---------- */
    if (/[a-zA-Z_]/.test(c)) {
      let id = "";
      while (i < input.length && /[a-zA-Z0-9_]/.test(input[i])) id += input[i++];
      tokens.push({ type: KEYWORDS.hasOwnProperty(id) ? KEYWORDS[id] : TOKENS.IDENTIFIER, value: id });
      continue;
    }

    /* ---------- STRINGS ---------- */
    if (c === '"') {
      let value = "";
      i++;
      while (i < input.length && input[i] !== '"') value += input[i++];
      i++;
      tokens.push({ type: TOKENS.STRING, value });
      continue;
    }

    /* ---------- SINGLE CHAR ---------- */
    const map = {
      "=": TOKENS.ASSIGN,
      "+": TOKENS.PLUS,
      "-": TOKENS.MINUS,
      "*": TOKENS.STAR,
      "/": TOKENS.SLASH,
      "%": TOKENS.PERCENT,
      "(": TOKENS.LPAREN,
      ")": TOKENS.RPAREN,
      "{": TOKENS.LBRACE,
      "}": TOKENS.RBRACE,
      "[": TOKENS.LBRACKET,
      "]": TOKENS.RBRACKET,
      ";": TOKENS.SEMICOLON,
      ".": TOKENS.DOT,
      ",": TOKENS.COMMA
    };

    if (map[c]) {
      tokens.push({ type: map[c], value: c });
      i++;
      continue;
    }

    throw new Error(`Lexer error: unknown character '${c}'`);
  }

  tokens.push({ type: TOKENS.EOF });
  return tokens;
}

module.exports = { tokenize };
