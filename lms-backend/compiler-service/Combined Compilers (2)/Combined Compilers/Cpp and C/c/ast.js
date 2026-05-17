// compiler/c/ast.js
// AST node definitions for the C front-end.
//
// Philosophy:
// - Keep nodes small and explicit.
// - Every node has { kind, loc }.
// - Semantic analysis may attach:
//     - node.inferredType
//     - node.symbol (resolved var/function symbol)
//     - node.fieldIndex / node.structLayout etc.

function loc(line, column) {
  return { line, column };
}

class Node {
  constructor(kind, loc) {
    this.kind = kind;
    this.loc = loc;
  }
}

// ------------------------------
// Program & Declarations
// ------------------------------

class Program extends Node {
  constructor(decls, loc) {
    super("Program", loc);
    this.decls = decls; // Decl[]
  }
}

class FunctionDecl extends Node {
  constructor(name, params, returnType, body, isPrototype, loc) {
    super("FunctionDecl", loc);
    this.name = name; // string
    this.params = params; // ParamDecl[]
    this.returnType = returnType; // TypeNode
    this.body = body; // BlockStmt | null
    this.isPrototype = !!isPrototype; // true if ends with ';'
  }
}

class ParamDecl extends Node {
  constructor(name, type, loc) {
    super("ParamDecl", loc);
    this.name = name; // string
    this.type = type; // TypeNode
  }
}

class VarDecl extends Node {
  constructor(name, type, init, isGlobal, loc) {
    super("VarDecl", loc);
    this.name = name; // string
    this.type = type; // TypeNode
    this.init = init; // Expr | null
    this.isGlobal = !!isGlobal; // determined by parser context
  }
}

class StructDecl extends Node {
  constructor(name, fields, loc) {
    super("StructDecl", loc);
    this.name = name; // string
    this.fields = fields; // StructFieldDecl[]
  }
}

class StructFieldDecl extends Node {
  constructor(name, type, loc) {
    super("StructFieldDecl", loc);
    this.name = name; // string
    this.type = type; // TypeNode
  }
}

// ------------------------------
// Type Nodes (AST-level)
// ------------------------------
// Note: These are syntactic types; sema converts to canonical types.

class TypeName extends Node {
  constructor(name, loc) {
    super("TypeName", loc);
    this.name = name; // "int" | "float" | "void" | "char" | "struct <name>" (parser can normalize)
  }
}

class PointerType extends Node {
  constructor(base, loc) {
    super("PointerType", loc);
    this.base = base; // TypeNode
  }
}

class ArrayType extends Node {
  constructor(base, sizeExpr, loc) {
    super("ArrayType", loc);
    this.base = base; // TypeNode
    this.sizeExpr = sizeExpr; // Expr | null (C allows omitted in params; we may restrict later)
  }
}

// A reference to a named struct type (struct S)
class StructType extends Node {
  constructor(name, loc) {
    super("StructType", loc);
    this.name = name; // string
  }
}

class EnumType extends Node {
  constructor(name, loc) {
    super("EnumType", loc);
    this.name = name; // string
  }
}

class TypedefDecl extends Node {
  constructor(name, type, loc) {
    super("TypedefDecl", loc);
    this.name = name; // string
    this.type = type; // TypeNode
  }
}

class EnumDecl extends Node {
  constructor(name, values, loc) {
    super("EnumDecl", loc);
    this.name = name; // string
    this.values = values; // Array<{ name: string, value: Expr | null }>
  }
}

// ------------------------------
// Statements
// ------------------------------

class BlockStmt extends Node {
  constructor(items, loc) {
    super("BlockStmt", loc);
    this.items = items; // (Stmt | VarDecl)[]
  }
}

class IfStmt extends Node {
  constructor(test, thenBranch, elseBranch, loc) {
    super("IfStmt", loc);
    this.test = test; // Expr
    this.thenBranch = thenBranch; // Stmt
    this.elseBranch = elseBranch; // Stmt | null
  }
}

class WhileStmt extends Node {
  constructor(test, body, loc) {
    super("WhileStmt", loc);
    this.test = test; // Expr
    this.body = body; // Stmt
  }
}

class ForStmt extends Node {
  constructor(init, test, update, body, loc) {
    super("ForStmt", loc);
    this.init = init; // (VarDecl | ExprStmt | null)
    this.test = test; // Expr | null
    this.update = update; // Expr | null
    this.body = body; // Stmt
  }
}

class ReturnStmt extends Node {
  constructor(value, loc) {
    super("ReturnStmt", loc);
    this.value = value; // Expr | null
  }
}

class BreakStmt extends Node {
  constructor(loc) {
    super("BreakStmt", loc);
  }
}

class ContinueStmt extends Node {
  constructor(loc) {
    super("ContinueStmt", loc);
  }
}

class SwitchStmt extends Node {
  constructor(test, cases, defaultCase, loc) {
    super("SwitchStmt", loc);
    this.test = test; // Expr
    this.cases = cases; // Array<{ value: Expr | null (for default), body: Stmt[] }>
    this.defaultCase = defaultCase; // Stmt[] | null
  }
}

class DoWhileStmt extends Node {
  constructor(body, test, loc) {
    super("DoWhileStmt", loc);
    this.body = body; // Stmt
    this.test = test; // Expr
  }
}

class GotoStmt extends Node {
  constructor(label, loc) {
    super("GotoStmt", loc);
    this.label = label; // string
  }
}

class LabelStmt extends Node {
  constructor(label, stmt, loc) {
    super("LabelStmt", loc);
    this.label = label; // string
    this.stmt = stmt; // Stmt
  }
}

class ExprStmt extends Node {
  constructor(expr, loc) {
    super("ExprStmt", loc);
    this.expr = expr; // Expr
  }
}

// ------------------------------
// Expressions
// ------------------------------

class IdentifierExpr extends Node {
  constructor(name, loc) {
    super("IdentifierExpr", loc);
    this.name = name; // string
    // sema: this.symbol
  }
}

class IntLiteralExpr extends Node {
  constructor(value, loc) {
    super("IntLiteralExpr", loc);
    this.value = value; // string (raw), sema may parse to number
  }
}

class FloatLiteralExpr extends Node {
  constructor(value, loc) {
    super("FloatLiteralExpr", loc);
    this.value = value; // string (raw)
  }
}

class CharLiteralExpr extends Node {
  constructor(value, loc) {
    super("CharLiteralExpr", loc);
    this.value = value; // string with escape sequences preserved
  }
}

class StringLiteralExpr extends Node {
  constructor(value, loc) {
    super("StringLiteralExpr", loc);
    this.value = value; // string with escape sequences preserved
  }
}

class UnaryExpr extends Node {
  constructor(op, expr, loc) {
    super("UnaryExpr", loc);
    this.op = op; // "!" | "-" | "*" | "&" | "~" | "++" | "--"
    this.expr = expr; // Expr
  }
}

class PostfixExpr extends Node {
  constructor(op, expr, loc) {
    super("PostfixExpr", loc);
    this.op = op; // "++" | "--"
    this.expr = expr; // Expr
  }
}

class BinaryExpr extends Node {
  constructor(op, left, right, loc) {
    super("BinaryExpr", loc);
    this.op = op; // "+", "-", "*", "/", "%", "==", "!=", "<", "<=", ">", ">=", "&&", "||", "&", "|", "^", "<<", ">>"
    this.left = left; // Expr
    this.right = right; // Expr
  }
}

class AssignExpr extends Node {
  constructor(target, value, loc) {
    super("AssignExpr", loc);
    this.target = target; // Expr (must be assignable, enforced in sema)
    this.value = value; // Expr
  }
}

class CompoundAssignExpr extends Node {
  constructor(target, op, value, loc) {
    super("CompoundAssignExpr", loc);
    this.target = target; // Expr (must be assignable)
    this.op = op; // "+=", "-=", "*=", etc.
    this.value = value; // Expr
  }
}

class CallExpr extends Node {
  constructor(callee, args, loc) {
    super("CallExpr", loc);
    this.callee = callee; // Expr (usually IdentifierExpr)
    this.args = args; // Expr[]
  }
}

class MemberExpr extends Node {
  constructor(object, field, isArrow, loc) {
    super("MemberExpr", loc);
    this.object = object; // Expr
    this.field = field; // string
    this.isArrow = !!isArrow; // true for ->, false for .
    // sema: fieldIndex, structType
  }
}

class IndexExpr extends Node {
  constructor(array, index, loc) {
    super("IndexExpr", loc);
    this.array = array; // Expr
    this.index = index; // Expr
  }
}

class CastExpr extends Node {
  constructor(typeNode, expr, loc) {
    super("CastExpr", loc);
    this.typeNode = typeNode; // TypeNode
    this.expr = expr; // Expr
  }
}

class SizeofExpr extends Node {
  constructor(arg, isType, loc) {
    super("SizeofExpr", loc);
    this.arg = arg; // Expr | TypeNode
    this.isType = !!isType; // true if sizeof(type), false if sizeof(expr)
  }
}

class TernaryExpr extends Node {
  constructor(condition, thenExpr, elseExpr, loc) {
    super("TernaryExpr", loc);
    this.condition = condition; // Expr
    this.thenExpr = thenExpr; // Expr
    this.elseExpr = elseExpr; // Expr
  }
}

class CommaExpr extends Node {
  constructor(left, right, loc) {
    super("CommaExpr", loc);
    this.left = left; // Expr
    this.right = right; // Expr
  }
}

class InitializerList extends Node {
  constructor(elements, loc) {
    super("InitializerList", loc);
    this.elements = elements; // Expr[]
  }
}

// ------------------------------
// Exports
// ------------------------------

module.exports = {
  loc,

  // Program / decls
  Program,
  FunctionDecl,
  ParamDecl,
  VarDecl,
  StructDecl,
  StructFieldDecl,

  // Types
  TypeName,
  PointerType,
  ArrayType,
  StructType,
  EnumType,
  
  // Declarations
  TypedefDecl,
  EnumDecl,

  // Stmts
  BlockStmt,
  IfStmt,
  WhileStmt,
  ForStmt,
  ReturnStmt,
  BreakStmt,
  ContinueStmt,
  SwitchStmt,
  DoWhileStmt,
  GotoStmt,
  LabelStmt,
  ExprStmt,

  // Exprs
  IdentifierExpr,
  IntLiteralExpr,
  FloatLiteralExpr,
  CharLiteralExpr,
  StringLiteralExpr,
  UnaryExpr,
  PostfixExpr,
  BinaryExpr,
  AssignExpr,
  CompoundAssignExpr,
  CallExpr,
  MemberExpr,
  IndexExpr,
  CastExpr,
  SizeofExpr,
  TernaryExpr,
  CommaExpr,
  InitializerList,
};
