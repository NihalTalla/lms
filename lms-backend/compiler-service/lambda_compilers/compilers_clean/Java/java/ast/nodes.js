class Program {
  constructor(body) {
    this.type = "Program";
    this.body = body;
  }
}

class VarDeclaration {
  constructor(varType, name, init) {
    this.type = "VarDeclaration";
    this.varType = varType;
    this.name = name;
    this.init = init;
  }
}
class TernaryExpression {
  constructor(condition, trueExpr, falseExpr) {
    this.type = "TernaryExpression";
    this.condition = condition;
    this.trueExpr = trueExpr;
    this.falseExpr = falseExpr;
  }
}


class PrintStatement {
  constructor(expression) {
    this.type = "PrintStatement";
    this.expression = expression;
  }
}
class IfStatement {
  constructor(condition, thenBody, elseBody = null) {
    this.type = "IfStatement";
    this.condition = condition;
    this.thenBody = thenBody;
    this.elseBody = elseBody;
  }
}

class WhileStatement {
  constructor(test, body) {
    this.type = "WhileStatement";
    this.test = test;
    this.body = body;
  }
}
class MethodDeclaration {
  constructor(name, params, body,isVoid = false,isStatic = false,access = 'public', isAbstract = false) {
    this.type = "MethodDeclaration";
    this.name = name;     // string
    this.params = params; // array of parameter names
    this.body = body;     // array of statements (null for abstract methods)
    this.isVoid = isVoid;
    this.isStatic = isStatic;
    this.access = access;
    this.isAbstract = isAbstract;  // v3.1: abstract method
  }
}

class ReturnStatement {
  constructor(value) {
    this.type = "ReturnStatement";
    this.value = value; // expression or null
  }
}


class BinaryExpression {
  constructor(left, operator, right) {
    this.type = "BinaryExpression";
    this.left = left;
    this.operator = operator; // GT, LT, GE, LE, EQ, NE
    this.right = right;
  }
}

class CallExpression {
  constructor(callee, args) {
    this.type = "CallExpression";
    this.callee = callee;   // function name
    this.arguments = args; // array of expressions
  }
}


class ArrayDeclaration {
  constructor(name, size) {
    this.type = "ArrayDeclaration";
    this.name = name;
    this.size = size;
  }
}

class ArrayAccess {
  constructor(name, index) {
    this.type = "ArrayAccess";
    this.name = name;
    this.index = index;
  }
}

class ArrayAssignment {
  constructor(name, index, value) {
    this.type = "ArrayAssignment";
    this.name = name;
    this.index = index;
    this.value = value;
  }
}
class ArrayLength {
  constructor(array) {
    this.type = "ArrayLength";
    this.array = array;
  }
}

class SwitchStatement {
  constructor(discriminant, cases, defaultCase) {
    this.type = "SwitchStatement";
    this.discriminant = discriminant; // expression after switch(...)
    this.cases = cases;               // array of CaseClause
    this.defaultCase = defaultCase;   // array of statements | null
  }
}

class CaseClause {
  constructor(value, body) {
    this.type = "CaseClause";
    this.value = value; // IntLiteral (constant)
    this.body = body;   // array of statements
  }
}

class IntLiteral {
  constructor(value) {
    this.type = "IntLiteral";
    this.value = value;
  }
}
class BreakStatement {
  constructor() {
    this.type = "BreakStatement";
  }
}
class ContinueStatement {
  constructor() {
    this.type = "ContinueStatement";
  }
}
class BooleanLiteral {
  constructor(value) {
    this.type = "BooleanLiteral";
    this.value = value; // true | false
  }
}

class StringLiteral {
  constructor(value) {
    this.type = "StringLiteral";
    this.value = value;
  }
}
class LogicalExpression {
  constructor(left, operator, right) {
    this.type = "LogicalExpression";
    this.left = left;
    this.operator = operator; // '&&' or '||'
    this.right = right;
  }
}
class UpdateExpression {
  constructor(operator, name, prefix) {
    this.type = "UpdateExpression";
    this.operator = operator; // TOKENS.INCREMENT or TOKENS.DECREMENT
    this.name = name;         // variable name (string)
    this.prefix = prefix;     // true = ++i / --i, false = i++ / i--
  }
}
class AssertionStatement {
  constructor(kind, payload) {
    this.type = "AssertionStatement";
    this.kind = kind;       // "assert" | "require" | "ensure" | "check" | "trap"
    this.payload = payload; // expression OR string message
  }
}


class UnaryExpression {
  constructor(operator, argument) {
    this.type = "UnaryExpression";
    this.operator = operator; // '!'
    this.argument = argument;
  }
}
class Assignment {
  constructor(name, value) {
    this.type = "Assignment";
    this.name = name;
    this.value = value;
  }
}

class Identifier {
  constructor(name) {
    this.type = "Identifier";
    this.name = name;
  }
}

class ClassDeclaration {
  constructor(name, fields, methods, constructors = [], superClass = null, isAbstract = false) {
    this.type = "ClassDeclaration";
    this.name = name;
    this.fields = fields;
    this.methods = methods;
    this.constructors = constructors;
    this.superClass = superClass;  // v2.7: extends clause
    this.isAbstract = isAbstract;  // v3.0: abstract class
  }
}

// v5.0: Enum declaration
class EnumDeclaration {
  constructor(name, values) {
    this.type = "EnumDeclaration";
    this.name = name;
    this.values = values; // Array of enum constant names
  }
}

class NewExpression {
  constructor(className, args = []) {
    this.type = "NewExpression";
    this.className = className;
    this.args = args;
  }
}



class FieldAccess {
  constructor(object, field) {
    this.type = "FieldAccess";
    this.object = object; // expression
    this.field = field;   // string
  }
}

class FieldAssignment {
  constructor(object, field, value) {
    this.type = "FieldAssignment";
    this.object = object; // expression
    this.field = field;   // string
    this.value = value;   // expression
  }
}

class ConstructorDeclaration {
  constructor(name, params, body, access = 'public') {
    this.type = "ConstructorDeclaration";
    this.name = name;
    this.params = params;
    this.arity = params.length;
    this.body = body;
    this.access = access;
  }
}

class ThisExpression {
  constructor() {
    this.type = "ThisExpression";
  }
}

class SuperExpression {
  constructor(method = null) {
    this.type = "SuperExpression";
    this.method = method;  // null for super(), string for super.method()
  }
}

class InterfaceDeclaration {
  constructor(name, methods) {
    this.type = "InterfaceDeclaration";
    this.name = name;
    this.methods = methods;  // array of abstract method signatures
  }
}

class CompoundAssignment {
  constructor(name, operator, value) {
    this.type = "CompoundAssignment";
    this.name = name;
    this.operator = operator; // e.g. TOKENS.PLUS, TOKENS.MINUS, etc.
    this.value = value;
  }
}
class DoWhileStatement {
  constructor(body, test) {
    this.type = "DoWhileStatement";
    this.body = body;
    this.test = test;
  }
}

// v4.4: Enhanced for-each loop
class ForEachStatement {
  constructor(varType, varName, collection, body) {
    this.type = "ForEachStatement";
    this.varType = varType;  // Type of the loop variable
    this.varName = varName;   // Name of the loop variable
    this.collection = collection; // Expression that evaluates to ArrayList, HashMap, or array
    this.body = body;         // Body of the loop
  }
}

// v1.0: Classic for loop
class ForStatement {
  constructor(init, test, update, body) {
    this.type = "ForStatement";
    this.init = init;       // Initialization statement (VarDeclaration or Assignment)
    this.test = test;       // Test expression (condition)
    this.update = update;   // Update expression (UpdateExpression or Assignment)
    this.body = body;       // Body of the loop
  }
}

module.exports = {
  Program,
  VarDeclaration,
  Assignment,
  PrintStatement,
  IntLiteral,
  StringLiteral,
  Identifier,
  BinaryExpression,
  CallExpression,
  WhileStatement,
  DoWhileStatement,
  MethodDeclaration,
  ReturnStatement,
  ArrayDeclaration,
  ArrayAccess,
  ArrayAssignment,
  ArrayLength,
  IfStatement,
  BreakStatement,
  ContinueStatement,
  BooleanLiteral,
  LogicalExpression,
  UnaryExpression,
  TernaryExpression,
  UpdateExpression,
  SwitchStatement,
  CaseClause,
  AssertionStatement,
  ClassDeclaration,
  EnumDeclaration,
  NewExpression,
  FieldAccess,
  FieldAssignment,
  ConstructorDeclaration,
  ThisExpression,
  SuperExpression,
  InterfaceDeclaration,
  CompoundAssignment,
  ForEachStatement,
  ForStatement
};
