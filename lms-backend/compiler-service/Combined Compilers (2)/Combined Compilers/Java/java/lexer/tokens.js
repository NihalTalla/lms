const TOKENS = {
  CLASS: "CLASS",
  ENUM: "ENUM",              // v5.0: Enums
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
  STATIC: "STATIC",
  VOID: "VOID",
  MAIN: "MAIN",
DO: "DO",

  INT: "INT",
  NEW: "NEW",
  STRING_KW: "STRING_KW",

  IDENTIFIER: "IDENTIFIER",
  NUMBER: "NUMBER",
  STRING: "STRING",

  SYSTEM: "SYSTEM",
  OUT: "OUT",
  PRINTLN: "PRINTLN",
ASSERT: "ASSERT",
REQUIRE: "REQUIRE",
ENSURE: "ENSURE",
CHECK: "CHECK",

  IF: "IF",
  ELSE: "ELSE",            // ✅ REQUIRED
  WHILE: "WHILE",
  FOR: "FOR",              // v4.4: Enhanced for-each loop
  RETURN: "RETURN",
SWITCH: "SWITCH",
CASE: "CASE",
DEFAULT: "DEFAULT",
ASSERT: "ASSERT",
REQUIRE: "REQUIRE",
ENSURE: "ENSURE",
CHECK: "CHECK",
TRAP: "TRAP",

  BREAK: "BREAK",          // ✅ REQUIRED
  CONTINUE: "CONTINUE",    // ✅ REQUIRED

  TRUE: "TRUE",            // ✅ REQUIRED
  FALSE: "FALSE",          // ✅ REQUIRED

  AND_AND: "AND_AND",      // &&
  OR_OR: "OR_OR",          // ||
  NOT: "NOT",              // !
QUESTION: "QUESTION",
COLON: "COLON",
PLUS_ASSIGN: "PLUS_ASSIGN",
MINUS_ASSIGN: "MINUS_ASSIGN",
STAR_ASSIGN: "STAR_ASSIGN",
SLASH_ASSIGN: "SLASH_ASSIGN",
PERCENT_ASSIGN: "PERCENT_ASSIGN",
BIT_AND_ASSIGN: "BIT_AND_ASSIGN",     // &=
BIT_OR_ASSIGN: "BIT_OR_ASSIGN",       // |=
BIT_XOR_ASSIGN: "BIT_XOR_ASSIGN",     // ^=
SHIFT_LEFT_ASSIGN: "SHIFT_LEFT_ASSIGN",   // <<=
SHIFT_RIGHT_ASSIGN: "SHIFT_RIGHT_ASSIGN",  // >>=
  LBRACKET: "LBRACKET",
  RBRACKET: "RBRACKET",

  PLUS: "PLUS",
  MINUS: "MINUS",
  INCREMENT: "INCREMENT",   // ++
DECREMENT: "DECREMENT",   // --
  STAR: "STAR",
  SLASH: "SLASH",
  PERCENT: "PERCENT",

  GT: "GT",
  LT: "LT",
  GE: "GE",
  LE: "LE",
  EQ: "EQ",
  NE: "NE",

  ASSIGN: "ASSIGN",
  SEMICOLON: "SEMICOLON",
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACE: "LBRACE",
  RBRACE: "RBRACE",
  DOT: "DOT",
  COMMA: "COMMA",

  EOF: "EOF",BIT_AND: "BIT_AND",       // &
  BIT_OR: "BIT_OR",         // |
  BIT_XOR: "BIT_XOR",       // ^
  BIT_NOT: "BIT_NOT",       // ~
  SHIFT_LEFT: "SHIFT_LEFT", // <<
  SHIFT_RIGHT: "SHIFT_RIGHT",// >>
  THIS: "THIS",              // Added for this keyword
  EXTENDS: "EXTENDS",        // v2.7
  SUPER: "SUPER",            // v2.8
  ABSTRACT: "ABSTRACT",      // v3.0
  INTERFACE: "INTERFACE",    // v3.2
  IMPLEMENTS: "IMPLEMENTS",  // v3.4
  PACKAGE: "PACKAGE",        // v8.0: Packages
  IMPORT: "IMPORT",          // v8.1: Imports
  INSTANCEOF: "INSTANCEOF"    // v7.4: instanceof operator
};


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
  System: TOKENS.SYSTEM,
  out: TOKENS.OUT,
  println: TOKENS.PRINTLN,

  if: TOKENS.IF,
  else: TOKENS.ELSE,          // ✅ THIS WAS MISSING
  while: TOKENS.WHILE,
  for: TOKENS.FOR,            // v4.4: Enhanced for-each loop
  return: TOKENS.RETURN,

  break: TOKENS.BREAK,
  continue: TOKENS.CONTINUE,
  true: TOKENS.TRUE,
  false: TOKENS.FALSE,
  this: TOKENS.THIS,          // Added for this keyword
  extends: TOKENS.EXTENDS,    // v2.7
  super: TOKENS.SUPER,        // v2.8
  abstract: TOKENS.ABSTRACT,  // v3.0
  interface: TOKENS.INTERFACE, // v3.2
  implements: TOKENS.IMPLEMENTS // v3.4
};

module.exports = { TOKENS, KEYWORDS };