// compiler/c/tokens.js
// Token definitions for the C front-end
// Designed to mirror style used in cpp/tokens.js where applicable

// ------------------------------
// Token kinds
// ------------------------------
const TokenKind = {
  // Special
  EOF: "EOF",
  INVALID: "INVALID",

  // Identifiers & literals
  IDENTIFIER: "IDENTIFIER",
  INT_LITERAL: "INT_LITERAL",
  FLOAT_LITERAL: "FLOAT_LITERAL",
  CHAR_LITERAL: "CHAR_LITERAL",
  STRING_LITERAL: "STRING_LITERAL",

  // Keywords
  KW_INT: "KW_INT",
  KW_FLOAT: "KW_FLOAT",
  KW_VOID: "KW_VOID",
  KW_CHAR: "KW_CHAR",
  KW_STRUCT: "KW_STRUCT",
  KW_IF: "KW_IF",
  KW_ELSE: "KW_ELSE",
  KW_WHILE: "KW_WHILE",
  KW_FOR: "KW_FOR",
  KW_RETURN: "KW_RETURN",
  KW_BREAK: "KW_BREAK",
  KW_CONTINUE: "KW_CONTINUE",
  KW_SIZEOF: "KW_SIZEOF",
  KW_SWITCH: "KW_SWITCH",
  KW_CASE: "KW_CASE",
  KW_DEFAULT: "KW_DEFAULT",
  KW_TYPEDEF: "KW_TYPEDEF",
  KW_ENUM: "KW_ENUM",
  KW_UNSIGNED: "KW_UNSIGNED",
  KW_LONG: "KW_LONG",
  KW_SHORT: "KW_SHORT",
  KW_DO: "KW_DO",
  KW_GOTO: "KW_GOTO",

  // Operators
  PLUS: "PLUS",                 // +
  MINUS: "MINUS",               // -
  STAR: "STAR",                 // *
  SLASH: "SLASH",               // /
  PERCENT: "PERCENT",           // %

  ASSIGN: "ASSIGN",             // =
  EQ: "EQ",                     // ==
  NEQ: "NEQ",                   // !=
  LT: "LT",                     // <
  LTE: "LTE",                   // <=
  GT: "GT",                     // >
  GTE: "GTE",                   // >=

  LOGICAL_AND: "LOGICAL_AND",   // &&
  LOGICAL_OR: "LOGICAL_OR",     // ||
  LOGICAL_NOT: "LOGICAL_NOT",   // !

  AMP: "AMP",                   // &
  PIPE: "PIPE",                 // |
  CARET: "CARET",               // ^
  TILDE: "TILDE",               // ~

  SHL: "SHL",                   // <<
  SHR: "SHR",                   // >>

  // Compound assignment
  PLUS_ASSIGN: "PLUS_ASSIGN",   // +=
  MINUS_ASSIGN: "MINUS_ASSIGN", // -=
  STAR_ASSIGN: "STAR_ASSIGN",   // *=
  SLASH_ASSIGN: "SLASH_ASSIGN", // /=
  PERCENT_ASSIGN: "PERCENT_ASSIGN", // %=
  AMP_ASSIGN: "AMP_ASSIGN",     // &=
  PIPE_ASSIGN: "PIPE_ASSIGN",   // |=
  CARET_ASSIGN: "CARET_ASSIGN", // ^=
  SHL_ASSIGN: "SHL_ASSIGN",     // <<=
  SHR_ASSIGN: "SHR_ASSIGN",     // >>=

  // Increment/decrement
  PLUS_PLUS: "PLUS_PLUS",       // ++
  MINUS_MINUS: "MINUS_MINUS",   // --

  // Delimiters
  LPAREN: "LPAREN",             // (
  RPAREN: "RPAREN",             // )
  LBRACE: "LBRACE",             // {
  RBRACE: "RBRACE",             // }
  LBRACKET: "LBRACKET",         // [
  RBRACKET: "RBRACKET",         // ]

  SEMICOLON: "SEMICOLON",       // ;
  COMMA: "COMMA",               // ,
  DOT: "DOT",                   // .
  ARROW: "ARROW",               // ->
  COLON: "COLON",               // :
  QUESTION: "QUESTION",         // ?
};

// ------------------------------
// Keyword lookup table
// ------------------------------
const Keywords = Object.create(null);

Keywords["int"] = TokenKind.KW_INT;
Keywords["float"] = TokenKind.KW_FLOAT;
Keywords["void"] = TokenKind.KW_VOID;
Keywords["char"] = TokenKind.KW_CHAR;
Keywords["struct"] = TokenKind.KW_STRUCT;

Keywords["if"] = TokenKind.KW_IF;
Keywords["else"] = TokenKind.KW_ELSE;
Keywords["while"] = TokenKind.KW_WHILE;
Keywords["for"] = TokenKind.KW_FOR;
Keywords["return"] = TokenKind.KW_RETURN;
Keywords["break"] = TokenKind.KW_BREAK;
Keywords["continue"] = TokenKind.KW_CONTINUE;

Keywords["sizeof"] = TokenKind.KW_SIZEOF;
Keywords["switch"] = TokenKind.KW_SWITCH;
Keywords["case"] = TokenKind.KW_CASE;
Keywords["default"] = TokenKind.KW_DEFAULT;
Keywords["typedef"] = TokenKind.KW_TYPEDEF;
Keywords["enum"] = TokenKind.KW_ENUM;
Keywords["unsigned"] = TokenKind.KW_UNSIGNED;
Keywords["long"] = TokenKind.KW_LONG;
Keywords["short"] = TokenKind.KW_SHORT;
Keywords["do"] = TokenKind.KW_DO;
Keywords["goto"] = TokenKind.KW_GOTO;

// ------------------------------
// Operator / punctuator maps
// (used by lexer for fast matching)
// ------------------------------
const SingleCharTokens = {
  "+": TokenKind.PLUS,
  "-": TokenKind.MINUS,
  "*": TokenKind.STAR,
  "/": TokenKind.SLASH,
  "%": TokenKind.PERCENT,

  "=": TokenKind.ASSIGN,
  "<": TokenKind.LT,
  ">": TokenKind.GT,
  "!": TokenKind.LOGICAL_NOT,

  "&": TokenKind.AMP,
  "|": TokenKind.PIPE,
  "^": TokenKind.CARET,
  "~": TokenKind.TILDE,

  "(": TokenKind.LPAREN,
  ")": TokenKind.RPAREN,
  "{": TokenKind.LBRACE,
  "}": TokenKind.RBRACE,
  "[": TokenKind.LBRACKET,
  "]": TokenKind.RBRACKET,

  ";": TokenKind.SEMICOLON,
  ",": TokenKind.COMMA,
  ".": TokenKind.DOT,
  ":": TokenKind.COLON,
  "?": TokenKind.QUESTION,
};

const TwoCharTokens = {
  "==": TokenKind.EQ,
  "!=": TokenKind.NEQ,
  "<=": TokenKind.LTE,
  ">=": TokenKind.GTE,
  "&&": TokenKind.LOGICAL_AND,
  "||": TokenKind.LOGICAL_OR,
  "<<": TokenKind.SHL,
  ">>": TokenKind.SHR,
  "->": TokenKind.ARROW,
  "+=": TokenKind.PLUS_ASSIGN,
  "-=": TokenKind.MINUS_ASSIGN,
  "*=": TokenKind.STAR_ASSIGN,
  "/=": TokenKind.SLASH_ASSIGN,
  "%=": TokenKind.PERCENT_ASSIGN,
  "&=": TokenKind.AMP_ASSIGN,
  "|=": TokenKind.PIPE_ASSIGN,
  "^=": TokenKind.CARET_ASSIGN,
  "<<=": TokenKind.SHL_ASSIGN,
  ">>=": TokenKind.SHR_ASSIGN,
  "++": TokenKind.PLUS_PLUS,
  "--": TokenKind.MINUS_MINUS,
};

// Three-character tokens (for lexer)
const ThreeCharTokens = {
  "<<=": TokenKind.SHL_ASSIGN,
  ">>=": TokenKind.SHR_ASSIGN,
};

// ------------------------------
// Exports
// ------------------------------
module.exports = {
  TokenKind,
  Keywords,
  SingleCharTokens,
  TwoCharTokens,
  ThreeCharTokens,
};
