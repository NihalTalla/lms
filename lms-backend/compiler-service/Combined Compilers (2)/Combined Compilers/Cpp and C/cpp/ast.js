// cpp/ast.js
// AST nodes with optional loc: { line, col }
//
// v0.8-compatible + v0.7-compat layer.
// This file keeps your current v0.8 node shapes, and ALSO restores/aliases
// the v0.7 node class names and property names that older stable v0.7
// parser/irgen code may still reference.
//
// Key principles:
// - Do NOT remove any v0.8 fields/constructors.
// - Add missing v0.7 node classes (as thin wrappers) and export aliases.
// - Where v0.7 used different property names (e.g., IndexExpr.base/index vs list/index),
//   we provide both names pointing to the same underlying data.
//
// NOTE: This is intentionally additive: existing code using the current classes
// continues to work, and older code expecting v0.7 class names will also work.

class Program {
  constructor(structs, classes, funcs, namespaces = null, loc = null) {
    this.structs = structs || [];
    this.classes = classes || [];
    this.funcs = funcs || [];
    // v1.1: namespaces (optional). Older code can ignore this.
    this.namespaces = namespaces || [];
    this.loc = loc;
  }
}

// v1.1: namespace declaration (frontend-only; usually flattened by a pass)
class NamespaceDecl {
  constructor(name, decls, loc = null) {
    this.name = name;
    this.decls = decls || []; // mix of StructDecl/ClassDecl/FunctionDecl/TemplateFunctionDecl/NamespaceDecl/etc.
    this.loc = loc;
  }
}

class StructDecl {
  constructor(name, fields, loc = null) {
    this.name = name;
    this.fields = fields; // [{ typeName, name, loc }, ...]
    this.loc = loc;
  }
}
class ConditionalExpr {
  constructor(cond, thenExpr, elseExpr, loc) {
    this.cond = cond;
    this.thenExpr = thenExpr;
    this.elseExpr = elseExpr;
    this.loc = loc;
  }
}
// v0.8: class declaration now supports single inheritance + destructors
class ClassDecl {
  constructor(name, baseName, fields, methods, destructors, loc = null) {
    this.name = name;
    this.baseName = baseName || null;      // e.g. "A" for "class B : public A"
    this.fields = fields || [];            // [{ typeName, name, isReadonly?, loc }, ...]
    this.methods = methods || [];          // MethodDecl[]
    this.destructors = destructors || [];  // DestructorDecl[] (0 or 1 typically)
    this.loc = loc;
  }
}

// v0.8: method declaration gains qualifiers
class MethodDecl {
  constructor(name, returnType, params, body, flags = null, loc = null) {
    this.name = name;
    this.returnType = returnType; // string: "int" | "float" | "bool" | "void" | "Pair*" | "T&" | "const T&" ...
    this.params = params || [];   // [{ typeName, name, loc }, ...]
    // body === null indicates a declaration without definition (extern/stub)
    this.body = body === null ? null : (body || []);
    this.isVirtual = !!(flags && flags.isVirtual);
    this.isOverride = !!(flags && flags.isOverride);
    this.isConst = !!(flags && flags.isConst);
    this.loc = loc;
  }
}

// v0.8: destructor node
class DestructorDecl {
  constructor(className, body, loc = null) {
    this.className = className;
    this.body = body === null ? null : (body || []);
    this.loc = loc;
  }
}

class FunctionDecl {
  constructor(name, returnType, params, body, loc = null) {
    this.name = name;
    this.returnType = returnType; // string
    this.params = params || [];   // [{ typeName, name, loc }, ...]
    // body === null indicates a declaration without definition (extern/stub)
    this.body = body === null ? null : (body || []);
    this.loc = loc;
  }
}

// v1.0: template function declaration (frontend-only; must be expanded before IRGen)
class TemplateFunctionDecl {
  constructor(typeParams, funcDecl, loc = null) {
    this.typeParams = typeParams || []; // ["T", ...]
    this.funcDecl = funcDecl;           // FunctionDecl
    this.loc = loc;
  }
}

// v1.1+: template class/struct declaration (frontend-only; expanded before IRGen)
class TemplateClassDecl {
  constructor(typeParams, classDecl, loc = null) {
    this.typeParams = typeParams || []; // ["T", ...] (type params only)
    this.classDecl = classDecl;         // ClassDecl
    this.loc = loc;
  }
}
class TemplateStructDecl {
  constructor(typeParams, structDecl, loc = null) {
    this.typeParams = typeParams || []; // ["T", ...]
    this.structDecl = structDecl;       // StructDecl
    this.loc = loc;
  }
}

// v1.0: explicit template callee: foo<int>
class TemplateCalleeExpr {
  constructor(callee, typeArgs, loc = null) {
    this.callee = callee;       // usually VarExpr
    this.typeArgs = typeArgs;   // ["int", "A*", ...]
    this.loc = loc;
  }
}

// v1.0: template call expression: foo<int>(...)
class TemplateCallExpr {
  constructor(callee, typeArgs, args, loc = null) {
    this.callee = callee;     // usually VarExpr
    this.typeArgs = typeArgs; // ["int", ...]
    this.args = args || [];
    this.loc = loc;
  }
}

class VarDecl {
  constructor(typeName, name, init = null, loc = null) {
    this.typeName = typeName; // can be "T", "T*", "T&", "const T&"
    this.name = name;
    this.init = init;
    this.loc = loc;
  }
}

class AssignStmt {
  constructor(name, expr, loc = null) {
    this.name = name;
    this.expr = expr;
    this.loc = loc;
  }
}

class AssignFieldStmt {
  constructor(base, field, value, loc = null) {
    this.base = base;
    this.field = field;
    this.value = value;
    this.loc = loc;
  }
}

// v0.7: assignment through pointer field: p->field = value;
class AssignPtrFieldStmt {
  constructor(basePtr, field, value, loc = null) {
    this.basePtr = basePtr; // expression evaluating to a pointer
    this.field = field;
    this.value = value;
    this.loc = loc;
  }
}

// v1.1: *ptr = expr;
class AssignPtrStmt {
  constructor(ptrExpr, expr, loc) {
    this.ptrExpr = ptrExpr;
    this.expr = expr;
    this.loc = loc;
  }
}

class PrintStmt {
  constructor(args, loc = null) {
    this.args = args || [];
    this.loc = loc;
  }
}

class IfStmt {
  constructor(cond, thenBody, elseBody, loc = null) {
    this.cond = cond;
    this.thenBody = thenBody || [];
    this.elseBody = elseBody || [];
    this.loc = loc;
  }
}

class WhileStmt {
  constructor(cond, body, loc = null) {
    this.cond = cond;
    this.body = body || [];
    this.loc = loc;
  }
}

// v1.1: for-loop statement
class ForStmt {
  // init: statement or null (VarDecl/AssignStmt/ExprStmt)
  // cond: expression or null
  // post: expression or null
  constructor(init, cond, post, body, loc = null) {
    this.init = init;
    this.cond = cond;
    this.post = post;
    this.body = body || [];
    this.loc = loc;
  }
}

class ReturnStmt {
  constructor(expr = null, loc = null) {
    this.expr = expr;
    this.loc = loc;
  }
}

class ExprStmt {
  constructor(expr, loc = null) {
    this.expr = expr;
    this.loc = loc;
  }
}

// v0.7: delete statement
class DeleteStmt {
  constructor(expr, loc = null) {
    this.expr = expr; // expression evaluating to a pointer (or null)
    this.loc = loc;
  }
}

// ----- Expressions -----
class IntLiteral {
  constructor(value, loc = null) {
    this.value = value;
    this.loc = loc;
  }
}

class FloatLiteral {
  constructor(value, loc = null) {
    this.value = value;
    this.loc = loc;
  }
}

class BoolLiteral {
  constructor(value, loc = null) {
    this.value = value;
    this.loc = loc;
  }
}

class StringLiteral {
  constructor(value, loc = null) {
    this.value = value;
    this.loc = loc;
  }
}

// v0.7: null literal
class NullLiteral {
  constructor(loc = null) {
    this.loc = loc;
  }
}

// v0.7: list literal [a, b, c]
class ListLiteral {
  constructor(elements, loc = null) {
    this.elements = elements || [];
    this.loc = loc;

    // common alias
    this.items = this.elements;
  }
}

// v0.7: new Type(...)
class NewExpr {
  constructor(typeName, args, loc = null) {
    this.typeName = typeName; // string name of struct/class
    this.args = args || [];
    this.loc = loc;
  }
}

class VarExpr {
  constructor(name, loc = null) {
    this.name = name;
    this.loc = loc;
  }
}

// this expression
class ThisExpr {
  constructor(loc = null) {
    this.loc = loc;
  }
}

class UnaryExpr {
  constructor(op, expr, loc = null) {
    this.op = op;
    this.expr = expr;
    this.loc = loc;
  }
}

// v1.1: C-style cast expression (targetType is a type string)
class CastExpr {
  constructor(targetType, expr, loc = null) {
    this.targetType = targetType;
    this.expr = expr;
    this.loc = loc;
  }
}

// v1.1: ++ / -- (only ++ implemented)
class IncExpr {
  // kind: 'pre' | 'post'
  constructor(expr, kind, loc = null) {
    this.expr = expr;
    this.kind = kind;
    this.loc = loc;
  }
}

class BinaryExpr {
  constructor(op, left, right, loc = null) {
    this.op = op;
    this.left = left;
    this.right = right;
    this.loc = loc;
  }
}

class FieldAccessExpr {
  constructor(base, field, loc = null) {
    this.base = base;
    this.field = field;
    this.loc = loc;
  }
}

class PtrFieldAccessExpr {
  constructor(basePtr, field, loc = null) {
    this.basePtr = basePtr;
    this.field = field;
    this.loc = loc;
  }
}

// v0.8: CallExpr takes a callee expression
class CallExpr {
  constructor(callee, args, loc = null) {
    this.callee = callee; // expression (VarExpr or FieldAccessExpr etc.)
    this.args = args || [];
    this.loc = loc;
  }
}

// v0.8: list indexing list[index]
class IndexExpr {
  constructor(list, index, loc = null) {
    this.list = list;
    this.index = index;
    this.loc = loc;

    // v0.7 compatibility aliases
    this.base = list;
    this.baseExpr = list;
    this.i = index;
    this.idx = index;
    this.indexExpr = index;
  }
}

// v0.8: list[index] = value
class AssignIndexStmt {
  constructor(list, index, value, loc = null) {
    this.list = list;
    this.index = index;
    this.value = value;
    this.loc = loc;

    // v0.7 compatibility aliases
    this.base = list;
    this.baseExpr = list;
    this.indexExpr = index;
    this.valueExpr = value;
  }
}

// ------------------------------------------------------------
// v0.7 COMPAT: restore common node names / shapes used previously
// ------------------------------------------------------------

// Some earlier versions used BlockStmt around statement arrays.
class BlockStmt {
  constructor(stmts, loc = null) {
    this.stmts = stmts || [];
    this.loc = loc;
  }
}

// Some earlier versions used PrintStmt(expr) instead of PrintStmt(args).
class Print1Stmt {
  constructor(expr, loc = null) {
    this.expr = expr;
    this.args = [expr];
    this.loc = loc;
  }
}

// Some earlier versions used CallExpr(nameString, args) rather than callee-expr.
class CallNameExpr {
  constructor(name, args, loc = null) {
    this.name = name; // string
    this.callee = new VarExpr(name, loc);
    this.args = args || [];
    this.loc = loc;
  }
}

// Some earlier versions had dedicated method call nodes.
class MethodCallExpr {
  constructor(base, methodName, args, loc = null) {
    this.base = base;
    this.methodName = methodName;
    this.args = args || [];
    this.loc = loc;

    // Also provide a callee expression view for v0.8-style pipelines
    this.callee = new FieldAccessExpr(base, methodName, loc);
  }
}

class PtrMethodCallExpr {
  constructor(basePtr, methodName, args, loc = null) {
    this.basePtr = basePtr;
    this.methodName = methodName;
    this.args = args || [];
    this.loc = loc;

    this.callee = new PtrFieldAccessExpr(basePtr, methodName, loc);
  }
}

// Earlier IRGen sometimes expected assignment to be (targetExpr, valueExpr).
class AssignExprStmt {
  constructor(target, value, loc = null) {
    this.target = target;
    this.value = value;
    this.loc = loc;
  }
}


// ----- Exceptions (v0.9) -----
// throw <expr>;
class ThrowStmt {
  constructor(expr, loc = null) {
    this.expr = expr;
    this.loc = loc;
  }
}

// catch (T name) { ... }
class CatchClause {
  constructor(typeName, name, body, loc = null) {
    this.typeName = typeName; // e.g. "int", "Base*", "const T&" (if supported)
    this.name = name;         // identifier
    this.body = body || [];   // statements
    this.loc = loc;
  }
}

// try { ... } catch (...) { ... }
// NOTE: Some parts of the pipeline may refer to this as TryCatchStmt (older name) or TryStmt (newer name).
class TryCatchStmt {
  constructor(tryBody, catchClause, loc = null) {
    this.tryBody = tryBody || [];
    this.catchClause = catchClause; // CatchClause
    this.loc = loc;
  }
}

// Alias: TryStmt (some code may use this name)
const TryStmt = TryCatchStmt;

// Provide v0.7 literal aliases (common shorter names)
const IntLit = IntLiteral;
const FloatLit = FloatLiteral;
const BoolLit = BoolLiteral;
const StringLit = StringLiteral;

// Provide v0.7 function/struct aliases
const FuncDecl = FunctionDecl;
const FunctionDef = FunctionDecl;
const StructDef = StructDecl;

// Provide v0.7 field access aliases
const DotExpr = FieldAccessExpr;
const ArrowExpr = PtrFieldAccessExpr;

module.exports = {
  // v0.8 exports
  Program,
  NamespaceDecl,
  StructDecl,
  ClassDecl,
  MethodDecl,
  DestructorDecl,
  FunctionDecl,
  // v1.0 templates
  TemplateFunctionDecl,
  TemplateClassDecl,
  TemplateStructDecl,
  TemplateCalleeExpr,
  TemplateCallExpr,
  VarDecl,
  AssignStmt,
  AssignFieldStmt,
  AssignPtrFieldStmt,
  AssignPtrStmt,
  AssignIndexStmt,
  PrintStmt,
  IfStmt,
  WhileStmt,
  ForStmt,
  ReturnStmt,
  ExprStmt,
  DeleteStmt,

  // exceptions
  ThrowStmt,
  CatchClause,
  TryCatchStmt,
  TryStmt,

  IntLiteral,
  FloatLiteral,
  BoolLiteral,
  StringLiteral,
  NullLiteral,
  ListLiteral,
  NewExpr,
  VarExpr,
  ThisExpr,
  UnaryExpr,
  CastExpr,
  IncExpr,
  BinaryExpr,
  FieldAccessExpr,
  PtrFieldAccessExpr,
  CallExpr,
  IndexExpr,

  // v0.7 compatibility exports (additive)
  BlockStmt,
  Print1Stmt,
  CallNameExpr,
  MethodCallExpr,
  PtrMethodCallExpr,
  AssignExprStmt,
  ConditionalExpr,
  IntLit,
  FloatLit,
  BoolLit,
  StringLit,

  FuncDecl,
  FunctionDef,
  StructDef,

  DotExpr,
  ArrowExpr,
};
