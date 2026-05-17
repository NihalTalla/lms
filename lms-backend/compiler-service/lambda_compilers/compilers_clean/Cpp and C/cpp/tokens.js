// cpp/tokens.js

module.exports = {
  // basic
  EOF: "EOF",
  IDENT: "IDENT",
  INT_LITERAL: "INT_LITERAL",
  FLOAT_LITERAL: "FLOAT_LITERAL",
  BOOL_LITERAL: "BOOL_LITERAL",
  STRING_LITERAL: "STRING_LITERAL",
  CLASS: "CLASS",
  THIS: "THIS",
  LIST: "LIST",
  STRING_KW: "STRING_KW",

  // keywords
  IMPORT: "IMPORT",
  INT: "INT",
  FLOAT: "FLOAT",
  BOOL: "BOOL",
  VOID: "VOID",
  RETURN: "RETURN",
  IF: "IF",
  ELSE: "ELSE",
  WHILE: "WHILE",
  FOR: "FOR",
  NAMESPACE: "NAMESPACE",

  // exceptions
  TRY: "TRY",
  CATCH: "CATCH",
  THROW: "THROW",

  // v1.0 templates (frontend-only)
  TEMPLATE: "TEMPLATE",
  TYPENAME: "TYPENAME",

  // v0.7 heap / pointers
  NEW: "NEW",
  DELETE: "DELETE",
  NULL: "NULL",

  // v0.8 inheritance / virtual dispatch / qualifiers
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
  PROTECTED: "PROTECTED",
  VIRTUAL: "VIRTUAL",
  OVERRIDE: "OVERRIDE",
  CONST: "CONST",
  READONLY: "READONLY",

  // v0.9 exception polish
  ELLIPSIS: "ELLIPSIS", // '...'

  // punctuation
  LPAREN: "LPAREN",
  RPAREN: "RPAREN",
  LBRACE: "LBRACE",
  RBRACE: "RBRACE",
  LBRACKET: "LBRACKET",
  RBRACKET: "RBRACKET",
  SEMICOLON: "SEMICOLON",
  COMMA: "COMMA",
  COLON: "COLON", // ':'
  SCOPE: "SCOPE", // '::'
  AMP: "AMP", // '&' (references)
  TILDE: "TILDE", // '~' (destructor)
  CHAR_LITERAL: "CHAR_LITERAL",
  QUESTION: "QUESTION", // '?'
  // assignment
  ASSIGN: "ASSIGN",

  // arithmetic operators
  PLUS: "PLUS",
  PLUSPLUS: "PLUSPLUS", // '++'
  MINUS: "MINUS",
  SHL: "SHL", // '<<'
  SHR: "SHR", // '>>'
  STAR: "STAR",
  SLASH: "SLASH",
  MOD: "MOD",

  // comparison operators
  EQEQ: "EQEQ",
  NEQ: "NEQ",
  LT: "LT",
  GT: "GT",
  LE: "LE",
  GE: "GE",

  // struct/class member access
  STRUCT: "STRUCT",
  DOT: "DOT",
  ARROW: "ARROW", // '->'

  // logical operators
  AND_AND: "AND_AND",
  OR_OR: "OR_OR",
  BANG: "BANG",
};
