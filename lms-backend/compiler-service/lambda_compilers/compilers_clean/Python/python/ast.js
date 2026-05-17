class NumberNode {
  constructor(value) { this.type = 'Number'; this.value = value; }
}

class VarNode {
  constructor(name) { this.type = 'Var'; this.name = name; }
}

class BinOpNode {
  constructor(left, op, right) {
    this.type = 'BinOp';
    this.left = left;
    this.op = op;
    this.right = right;
  }
}

class AssignNode {
  constructor(name, value) {
    this.type = 'Assign';
    this.name = name;
    this.value = value;
  }
}

class PrintNode {
  constructor(expr, end = null) {
    this.type = 'Print';
    this.expr = expr;
    this.end = end; // Optional end parameter (defaults to "\n")
  }
}

class IfNode {
  constructor(condition, thenBody, elseBody = null, elifs = []) {
    this.type = 'If';
    this.condition = condition;
    this.thenBody = thenBody;
    this.elseBody = elseBody;
    this.elifs = elifs;   // 🔹 NEW
  }
}

class WhileNode {
  constructor(condition, body, elseBody = null) {
    this.type = 'While';
    this.condition = condition;
    this.body = body;
    this.elseBody = elseBody; // Executes if loop completes normally (no break)
  }
}

class ListNode {
  constructor(elements) {
    this.type = 'List';
    this.elements = elements;
  }
}

class DictNode {
  constructor(pairs) {
    this.type = 'Dict';
    this.pairs = pairs; // Array of [key, value] pairs
  }
}

class TupleNode {
  constructor(elements) {
    this.type = 'Tuple';
    this.elements = elements;
  }
}

class SetNode {
  constructor(elements) {
    this.type = 'Set';
    this.elements = elements;
  }
}

// v2.2: Comprehensions
class ListCompNode {
  constructor(expr, target, iterable, condition = null) {
    this.type = 'ListComp';
    this.expr = expr;        // Expression to evaluate for each item
    this.target = target;    // Variable name (target of for loop)
    this.iterable = iterable; // Iterable expression
    this.condition = condition; // Optional if condition
  }
}

class DictCompNode {
  constructor(keyExpr, valueExpr, target, iterable, condition = null) {
    this.type = 'DictComp';
    this.keyExpr = keyExpr;    // Key expression
    this.valueExpr = valueExpr; // Value expression
    this.target = target;      // Variable name
    this.iterable = iterable;   // Iterable expression
    this.condition = condition; // Optional if condition
  }
}

class SetCompNode {
  constructor(expr, target, iterable, condition = null) {
    this.type = 'SetComp';
    this.expr = expr;        // Expression to evaluate for each item
    this.target = target;    // Variable name
    this.iterable = iterable; // Iterable expression
    this.condition = condition; // Optional if condition
  }
}

class IndexNode {
  constructor(list, index) {
    this.type = 'Index';
    this.list = list;
    this.index = index;
  }
}

class SliceNode {
  constructor(obj, start, end, step = null) {
    this.type = 'Slice';
    this.obj = obj;       // expression producing list/string
    this.start = start;   // expression or null
    this.end = end;       // expression or null
    this.step = step;     // expression or null
  }
}
class AssignIndexNode {
  constructor(list, index, value) {
    this.type = 'AssignIndex';
    this.list = list;
    this.index = index;
    this.value = value;
  }
}

class AssignSliceNode {
  constructor(obj, start, end, step, value) {
    this.type = 'AssignSlice';
    this.obj = obj;
    this.start = start;
    this.end = end;
    this.step = step;
    this.value = value;
  }
}

class CallNode {
  constructor(name, { args = [], kwargs = {} }) {
    this.type = 'Call';
    this.name = name;
    this.args = args;
    this.kwargs = kwargs;
  }
}


class ForNode {
  constructor(varName, args, body, elseBody = null) {
    this.type = 'For';
    this.varName = varName;
    this.args = args; // [end] | [start, end] | [start, end, step]
    this.body = body;
    this.elseBody = elseBody; // Executes if loop completes normally (no break)
  }
}


class BreakNode { constructor(){ this.type='Break'; } }
class ContinueNode { constructor(){ this.type='Continue'; } }

class FunctionNode {
  constructor(name, params, body, returnAnnotation = null) {
    this.type = 'Function';
    this.name = name;
    this.params = params;
    this.body = body;
    this.returnAnnotation = returnAnnotation; // AST or null (ignored at runtime)
  }
}
class ParamNode {
  constructor(name, defaultValue = null, annotation = null) {
    this.name = name;
    this.default = defaultValue; // AST or null
    this.annotation = annotation; // AST or null (ignored at runtime)
  }
}

class ReturnNode {
  constructor(value) {
    this.type = 'Return';
    this.value = value;
  }
}
class PrintInlineNode {
  constructor(expr) {
    this.type = 'PrintInline';
    this.expr = expr;
  }
}
class StringNode {
  constructor(value) {
    this.type = 'String';
    this.value = value;
  }
}
class UnaryOpNode {
  constructor(op, expr) {
    this.type = 'UnaryOp';
    this.op = op;
    this.expr = expr;
  }
}
class ListAppendNode {
  constructor(listExpr, valueExpr) {
    this.type = 'ListAppend'
    this.list = listExpr
    this.value = valueExpr
  }
}

class ListPopNode {
  constructor(listExpr) {
    this.type = 'ListPop'
    this.list = listExpr
  }
}
class PassNode {
  constructor() {
    this.type = 'Pass';
  }
}
class TernaryNode {
  constructor(cond, thenExpr, elseExpr) {
    this.type = 'Ternary';
    this.cond = cond;
    this.thenExpr = thenExpr;
    this.elseExpr = elseExpr;
  }
}
class GlobalNode {
  constructor(names) {
    this.type = 'Global';
    this.names = names;
  }
}

class NonlocalNode {
  constructor(names) {
    this.type = 'Nonlocal';
    this.names = names;
  }
}
class ExprStmtNode {
  constructor(expr) {
    this.type = 'ExprStmt';
    this.expr = expr;
  }
}

class TryNode {
  constructor(tryBody, exceptClauses, finallyBody) {
    this.type = 'Try';
    this.tryBody = tryBody;
    this.exceptClauses = exceptClauses; // Array of {exception: expr or null, name: string or null, body: []}
    this.finallyBody = finallyBody; // Array of statements or null
  }
}

class RaiseNode {
  constructor(expr) {
    this.type = 'Raise';
    this.expr = expr; // expression or null
  }
}

class AssertNode {
  constructor(condition, message) {
    this.type = 'Assert';
    this.condition = condition;
    this.message = message; // expression or null
  }
}

// v2.0 - Object Model
class ClassNode {
  constructor(name, baseClass, methods) {
    this.type = 'Class';
    this.name = name;
    this.baseClass = baseClass; // AST expression or null (for single inheritance)
    this.methods = methods; // Array of FunctionNode
  }
}

class AttrNode {
  constructor(obj, attr) {
    this.type = 'Attr';
    this.obj = obj; // expression
    this.attr = attr; // string attribute name
  }
}

class AttrAssignNode {
  constructor(obj, attr, value) {
    this.type = 'AttrAssign';
    this.obj = obj; // expression
    this.attr = attr; // string attribute name
    this.value = value; // expression
  }
}

class SuperNode {
  constructor() {
    this.type = 'Super';
  }
}

module.exports = {
  NumberNode, VarNode, BinOpNode, AssignNode, PrintNode,
  IfNode, WhileNode, ListNode, DictNode, TupleNode, SetNode, IndexNode, AssignIndexNode, AssignSliceNode,
  CallNode, ForNode, BreakNode, ContinueNode,
  FunctionNode, ReturnNode,PrintInlineNode,StringNode
  ,UnaryOpNode,SliceNode, ListAppendNode, ListPopNode,
  PassNode, TernaryNode, GlobalNode, NonlocalNode, ExprStmtNode,
  TryNode, RaiseNode, AssertNode, ParamNode,
  ClassNode, AttrNode, AttrAssignNode, SuperNode,
  ListCompNode, DictCompNode, SetCompNode  // v2.2: Comprehensions
};
