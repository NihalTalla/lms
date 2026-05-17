
const { IRProgram } = require("../../ir/ir");
const { TOKENS } = require("../lexer/tokens");

let labelCounter = 0;
const switchEndStack = [];
const breakStack = [];
const continueStack = [];
const classTable = {};
const constructorTable = {};
const staticFields = {};
const classHierarchy = {}; // v4.0: Maps className -> superClass
let mainClassName = null;
// ================================
// v2.7 STEP 1 — Canonical Type Helper
// ================================
function typeToString(type) {
  if (!type) {
    throw new Error("InternalError: missing type");
  }

  // Primitive types
  if (type === "int" || type.kind === "int") return "INT";
  if (type === "boolean" || type.kind === "boolean") return "BOOLEAN";
  if (type === "String" || type.kind === "string") return "STRING";
  if (type === "void" || type.kind === "void") return "VOID";

  // Class types (identifier-based)
  if (typeof type === "string") {
    return type; // class name
  }

  // Array types
  if (type.kind === "array") {
    return `${typeToString(type.elementType)}[]`;
  }

  throw new Error(`InternalError: unknown type ${JSON.stringify(type)}`);
}
// ================================
// v2.7 STEP 3 — Expression Type Inference
// ================================
function inferExprType(node, scope, context = {}) {
  if (!node) {
    throw new Error("InternalError: inferExprType on null");
  }

  switch (node.type) {

    case "IntLiteral":
      return "INT";

    case "StringLiteral":
      return "STRING";

    case "BooleanLiteral":
      return "BOOLEAN";

    case "Identifier": {
      // Local variable
      if (scope && scope.has(node.name)) {
        // locals are always INT in v0.x–v2.x
        return "INT";
      }

      // Field
      const fields = classTable[currentClass] || [];
      const f = fields.find(x => x.name === node.name);
      if (f) {
        return typeToString(f.type);
      }

      throw new Error(`CompileError: unknown identifier ${node.name}`);
    }

    case "FieldAccess": {
      const objType =
        node.object.type === "Identifier" &&
        classTable[node.object.name]
          ? node.object.name
          : currentClass;

      const fields = classTable[objType] || [];
      const f = fields.find(x => x.name === node.field);
      if (!f) {
        throw new Error(`CompileError: unknown field ${node.field}`);
      }
      return typeToString(f.type);
    }

    case "BinaryExpression": {
      if (node.operator === TOKENS.PLUS) {
        const lt = inferExprType(node.left, scope, context);
        const rt = inferExprType(node.right, scope, context);
        if (lt === "STRING" || rt === "STRING") return "STRING";
      }
      return "INT";
    }

    case "LogicalExpression":
    case "UnaryExpression":
      return "BOOLEAN";

    case "CallExpression": {
      // Will be resolved later — for now use method return type
      return context.expectedReturnType || "INT";
    }

    case "NewExpression":
      return node.className;

    case "ArrayAccess":
      return "INT";

    case "ArrayLength":
      return "INT";

    default:
      throw new Error(
        `InternalError: cannot infer type of ${node.type}`
      );
  }
}

function generateIR(ast) {
  labelCounter = 0;
function methodLabel(className, name, arity, count) {
  return count === 1
    ? `method_${className}_${name}`
    : `method_${className}_${name}_${arity}`;
}

  // v4.0: Helper to find method in inheritance chain
  // v4.3: Modified to handle multiple classes with same method signature (e.g., ArrayList.iterator() and HashMap.iterator())
  function findMethodInHierarchy(className, methodName, signature) {
    let currentClass = className;
    while (currentClass) {
      if (methods[methodName] && methods[methodName][signature]) {
        const entry = methods[methodName][signature];
        // v4.3: Check if this entry belongs to the current class
        if (entry.className === currentClass) {
          return entry;
        }
      }
      // Check parent class
      currentClass = classHierarchy[currentClass] || null;
      if (currentClass === "Object" && !classHierarchy["Object"]) {
        // We've reached Object, stop
        break;
      }
    }
    return null;
  }

  function currentFrameHasThis() {
    return true;  // Placeholder; update in v2.5 for static
  }

  function emitFail(ir, kind, message) {
    ir.emit("LOAD_CONST", message);
    ir.emit(kind);
  }

  const ir = new IRProgram();
  let currentMethodIsStatic = false;
  let currentClass = null;
  let methods = {}; // name -> { signature -> { method, className } }


  // FIRST PASS: collect class info, methods, constructors
  let classDecl;
  for (const node of ast.body) {
    if (node.type === "ClassDeclaration") {
      classDecl = node;
      mainClassName = node.name;
      classTable[node.name] = node.fields;
      
      // v4.0: Track class hierarchy (superClass)
      const superClass = node.superClass || "Object";
      classHierarchy[node.name] = superClass;

      // Collect static fields
    staticFields[node.name] = {};
    for (const field of node.fields) {
      if (field.isStatic) {
        staticFields[node.name][field.name] = field.init ? field.init : null;
      }
    }

      // Collect methods from classDecl
      for (const m of node.methods) {
  if (!methods[m.name]) methods[m.name] = {};
// STEP 2: params have NO type yet → use arity placeholder
const signature = `$arity:${m.params.length}`;

  // Check if this method already exists in THIS class (not globally)
  const existing = methods[m.name][signature];
  if (existing && existing.className === node.name) {
    throw new Error(
      `CompileError: duplicate method ${m.name}(${signature}) in class ${node.name}`
    );
  }

  methods[m.name][signature] = {
    method: m,
    className: node.name
  };
}

      // Constructors
      let hasCtor = false;
      for (const c of node.constructors) {
        constructorTable[node.name] = c;  // Last one for now (v2.6 overloading)
        hasCtor = true;
      }

      if (!hasCtor) {
        // Default constructor
        constructorTable[node.name] = {
          type: "ConstructorDeclaration",
          name: node.name,
          params: [],
          body: [],
          access: 'public'
        };
      }
    }
  }
  
  // v4.0: Add Object class to classTable and methods
  if (!classTable["Object"]) {
    classTable["Object"] = []; // Object has no fields
    classHierarchy["Object"] = null; // Object is the root
    
    // Add Object methods to methods table
    if (!methods["toString"]) methods["toString"] = {};
    methods["toString"]["$arity:0"] = {
      method: {
        name: "toString",
        params: [],
        returnType: "String",
        isStatic: false,
        body: []
      },
      className: "Object"
    };
    
    if (!methods["equals"]) methods["equals"] = {};
    methods["equals"]["$arity:1"] = {
      method: {
        name: "equals",
        params: ["other"],
        returnType: "int",
        isStatic: false,
        body: []
      },
      className: "Object"
    };
    
    if (!methods["hashCode"]) methods["hashCode"] = {};
    methods["hashCode"]["$arity:0"] = {
      method: {
        name: "hashCode",
        params: [],
        returnType: "int",
        isStatic: false,
        body: []
      },
      className: "Object"
    };
  }
  
  // v4.2: Add ArrayList and HashMap as built-in classes
  if (!classTable["ArrayList"]) {
    classTable["ArrayList"] = []; // ArrayList has no fields (uses heap storage)
    classHierarchy["ArrayList"] = "Object";
    
    // ArrayList methods
    if (!methods["add"]) methods["add"] = {};
    methods["add"]["$arity:1"] = {
      method: {
        name: "add",
        params: ["element"],
        returnType: "void",
        isStatic: false,
        body: []
      },
      className: "ArrayList"
    };
    
    if (!methods["get"]) methods["get"] = {};
    methods["get"]["$arity:1"] = {
      method: {
        name: "get",
        params: ["index"],
        returnType: "Object",
        isStatic: false,
        body: []
      },
      className: "ArrayList"
    };
    
    if (!methods["size"]) methods["size"] = {};
    methods["size"]["$arity:0"] = {
      method: {
        name: "size",
        params: [],
        returnType: "int",
        isStatic: false,
        body: []
      },
      className: "ArrayList"
    };
    
    // Default constructor
    constructorTable["ArrayList"] = {
      type: "ConstructorDeclaration",
      name: "ArrayList",
      params: [],
      body: [],
      access: 'public'
    };
  }
  
  if (!classTable["HashMap"]) {
    classTable["HashMap"] = []; // HashMap has no fields (uses heap storage)
    classHierarchy["HashMap"] = "Object";
    
    // HashMap methods
    if (!methods["put"]) methods["put"] = {};
    methods["put"]["$arity:2"] = {
      method: {
        name: "put",
        params: ["key", "value"],
        returnType: "void",
        isStatic: false,
        body: []
      },
      className: "HashMap"
    };
    
    // HashMap.get() - different from ArrayList.get() (different class)
    if (!methods["get"]) methods["get"] = {};
    // Check if ArrayList version exists
    const existingGet = methods["get"]["$arity:1"];
    if (!existingGet || existingGet.className !== "HashMap") {
      methods["get"]["$arity:1"] = {
        method: {
          name: "get",
          params: ["key"],
          returnType: "Object",
          isStatic: false,
          body: []
        },
        className: "HashMap"
      };
    }
    
    if (!methods["containsKey"]) methods["containsKey"] = {};
    methods["containsKey"]["$arity:1"] = {
      method: {
        name: "containsKey",
        params: ["key"],
        returnType: "int",
        isStatic: false,
        body: []
      },
      className: "HashMap"
    };
    
    // HashMap.size() - separate from ArrayList.size()
    if (!methods["size"]) methods["size"] = {};
    const existingSize = methods["size"]["$arity:0"];
    if (!existingSize || existingSize.className !== "HashMap") {
      methods["size"]["$arity:0"] = {
        method: {
          name: "size",
          params: [],
          returnType: "int",
          isStatic: false,
          body: []
        },
        className: "HashMap"
      };
    }
    
    // Default constructor
    constructorTable["HashMap"] = {
      type: "ConstructorDeclaration",
      name: "HashMap",
      params: [],
      body: [],
      access: 'public'
    };
  }
  
  // v4.3: Add Iterator as built-in class
  if (!classTable["Iterator"]) {
    classTable["Iterator"] = []; // Iterator has no fields (uses heap storage)
    classHierarchy["Iterator"] = "Object";
    
    // Iterator methods
    if (!methods["hasNext"]) methods["hasNext"] = {};
    methods["hasNext"]["$arity:0"] = {
      method: {
        name: "hasNext",
        params: [],
        returnType: "int",
        isStatic: false,
        body: []
      },
      className: "Iterator"
    };
    
    if (!methods["next"]) methods["next"] = {};
    methods["next"]["$arity:0"] = {
      method: {
        name: "next",
        params: [],
        returnType: "Object",
        isStatic: false,
        body: []
      },
      className: "Iterator"
    };
  }
  
  // v4.3: Add iterator() method to ArrayList
  if (!methods["iterator"]) methods["iterator"] = {};
  const existingArrayListIterator = methods["iterator"]["$arity:0"];
  if (!existingArrayListIterator || existingArrayListIterator.className !== "ArrayList") {
    methods["iterator"]["$arity:0"] = {
      method: {
        name: "iterator",
        params: [],
        returnType: "Iterator",
        isStatic: false,
        body: []
      },
      className: "ArrayList"
    };
  }
  
  // v4.3: Add iterator() method to HashMap
  // Note: Both ArrayList and HashMap have iterator() with same signature
  // Method resolution will find the correct one based on receiver type
  // We need to register HashMap's version - it will be found when calling on HashMap
  // Since methods["iterator"]["$arity:0"] can only hold one entry, we'll handle this
  // by having the method resolution check the receiver type in findMethodInHierarchy
  // For now, we'll add it - the method resolution should find ArrayList's first, then HashMap's
  // Actually, we need to store both - let's use a different approach
  // We'll store both and let findMethodInHierarchy find the right one based on className
  
  // v4.5: Add StringBuilder as built-in class
  if (!classTable["StringBuilder"]) {
    classTable["StringBuilder"] = []; // StringBuilder has no fields (uses heap storage)
    classHierarchy["StringBuilder"] = "Object";
    
    // StringBuilder methods
    if (!methods["append"]) methods["append"] = {};
    methods["append"]["$arity:1"] = {
      method: {
        name: "append",
        params: ["value"],
        returnType: "StringBuilder",
        isStatic: false,
        body: []
      },
      className: "StringBuilder"
    };
    
    // toString() already exists for Object, but we need StringBuilder's version
    if (!methods["toString"]) methods["toString"] = {};
    const existingToString = methods["toString"]["$arity:0"];
    if (!existingToString || existingToString.className !== "StringBuilder") {
      // Store StringBuilder's toString separately - method resolution will find it
    }
    
    if (!methods["length"]) methods["length"] = {};
    methods["length"]["$arity:0"] = {
      method: {
        name: "length",
        params: [],
        returnType: "int",
        isStatic: false,
        body: []
      },
      className: "StringBuilder"
    };
    
    // Default constructor
    constructorTable["StringBuilder"] = {
      type: "ConstructorDeclaration",
      name: "StringBuilder",
      params: [],
      body: [],
      access: 'public'
    };
  }
// ===== v2.6: count overloads per method name =====
const overloadCounts = {};
for (const name in methods) {
  for (const signature in methods[name]) {
    const entry = methods[name][signature];
    const key = `${entry.className}.${name}`;
    overloadCounts[key] = (overloadCounts[key] || 0) + 1;
  }
}

  const gen = function(node, scope, context = {}) {
    if (!node) return;
    if (Array.isArray(node)) {
      for (const n of node) gen(n, scope, context);
      return;
    }

    switch (node.type) {
      case "ClassDeclaration":
        break;

      case "EnumDeclaration":
        // v5.0: Register enum in classTable for later reference
        // Enums are treated as classes with static final fields
        if (!classTable[node.name]) {
          classTable[node.name] = [];
        }
        // Add each enum value as a static final field
        for (const value of node.values) {
          classTable[node.name].push({
            name: value,
            isStatic: true,
            init: null
          });
        }
        break;

         case "PrintStatement":
        gen(node.expression, scope, context);
        ir.emit("PRINT");
        break;

      case "IntLiteral":
        ir.emit("LOAD_CONST", node.value);
        break;

      case "BooleanLiteral":
        ir.emit("LOAD_CONST", node.value ? 1 : 0);
        break;

      case "StringLiteral":
        ir.emit("LOAD_CONST", node.value);
        break;

case "Identifier": {
  const name = node.name;

  // Local variable (params, locals)
  if (scope && scope.has(name)) {
    ir.emit("LOAD_VAR", name);
    break;
  }

  // Static context → static field
  if (currentMethodIsStatic) {
    ir.emit("LOAD_STATIC", { class: currentClass || mainClassName, field: name });
    break;
  }

  // Instance field
  ir.emit("LOAD_THIS");
  ir.emit("LOAD_FIELD", name);
  break;
}
      case "ThisExpression":
  if (!currentFrameHasThis()) {
    throw new Error("Cannot use 'this' in a static method");
  }
  ir.emit("LOAD_THIS");
  break;

      case "VarDeclaration":
        gen(node.init, scope, context);
        ir.emit("STORE_VAR", node.name);
        scope.add(node.name);
        break;

   case "Assignment": {
  const name = node.name;
  const isLocal = scope && scope.has(name);
if (isLocal) {
  gen(node.value, scope, context);
  ir.emit("STORE_VAR", name);
  break;
}

if (currentMethodIsStatic) {
  gen(node.value, scope, context);
  ir.emit("STORE_STATIC", { class: currentClass, field: name });
  break;
}
 else {
    // Instance field write: push object FIRST, then value
    ir.emit("LOAD_THIS");
    gen(node.value, scope, context);
    ir.emit("STORE_FIELD", name);
  }
  break;
}

 case "CompoundAssignment": {
  const name = node.name;
  const isLocal = scope && scope.has(name);
  let binOp;
  switch (node.operator) {
    case TOKENS.PLUS:     binOp = "ADD"; break;
    case TOKENS.MINUS:    binOp = "SUB"; break;
    case TOKENS.STAR:     binOp = "MUL"; break;
    case TOKENS.SLASH:    binOp = "DIV"; break;
    case TOKENS.PERCENT:  binOp = "MOD"; break;
    case TOKENS.BIT_AND:  binOp = "BIT_AND"; break;
    case TOKENS.BIT_OR:   binOp = "BIT_OR"; break;
    case TOKENS.BIT_XOR:  binOp = "BIT_XOR"; break;
    case TOKENS.SHIFT_LEFT: binOp = "SHL"; break;
    case TOKENS.SHIFT_RIGHT: binOp = "SHR"; break;
    default: throw new Error(`Unknown compound operator ${node.operator}`);
  }

  if (isLocal || currentMethodIsStatic) {
    ir.emit("LOAD_VAR", name);
  } else {
    ir.emit("LOAD_THIS");
    ir.emit("DUP");
    ir.emit("LOAD_FIELD", name);
  }

  gen(node.value, scope, context);
  ir.emit(binOp);

  if (isLocal) {
  gen(node.value, scope, context);
  ir.emit("STORE_VAR", name);
  break;
}

if (currentMethodIsStatic) {
  gen(node.value, scope, context);
  ir.emit("STORE_STATIC", { class: currentClass, field: name });
  break;
}
else {
    ir.emit("STORE_FIELD", name);
  }

  break;
}

      case "NewExpression": {
        // v4.2: Special handling for ArrayList and HashMap
        // v4.5: Special handling for StringBuilder
        if (node.className === "ArrayList" || node.className === "HashMap" || node.className === "StringBuilder") {
          // Create object first
          const fields = classTable[node.className] || [];
          const layout = {};
          for (const f of fields) {
            layout[f.name] = 0;
          }
          // Add __heapId field for collection storage
          layout["__heapId"] = 0;

          ir.emit("NEW_OBJECT", {
            className: node.className,
            fields: layout
          });

          const args = node.args || [];
          for (const a of args) gen(a, scope, context);

          ir.emit("CALL_CONSTRUCTOR", {
            className: node.className,
            argc: 1 + args.length
          });
          break;
        }
        
        // Regular class instantiation
        const fields = classTable[node.className] || [];
        const layout = {};
        for (const f of fields) {
          layout[f.name] = 0;
        }

        ir.emit("NEW_OBJECT", {
          className: node.className,
          fields: layout
        });

        const args = node.args || [];
        for (const a of args) gen(a, scope, context);

        ir.emit("CALL_CONSTRUCTOR", {
          className: node.className,
          argc: 1 + args.length
        });
        break;
      }

  case "FieldAccess": {
  let className = null;

  // v0.8.1 FIX: Handle array.length specially
  if (node.field === "length") {
    // For any expression with .length, try to emit ARRAY_LENGTH
    gen(node.object, scope, context);
    ir.emit("ARRAY_LENGTH");
    break;
  }

  // Case 1: ClassName.field
  if (
    node.object.type === "Identifier" &&
    classTable[node.object.name]
  ) {
    className = node.object.name;
  }

  // Case 2: instance.field → resolve using current class
  if (!className) {
    className = currentClass;
  }

  const fields = classTable[className] || [];
  const field = fields.find(f => f.name === node.field);

  // STATIC FIELD (via class OR via instance)
  if (field && field.isStatic) {
    ir.emit("LOAD_STATIC", { class: className, field: node.field });
    break;
  }

  // INSTANCE FIELD
  gen(node.object, scope, context);   // push object
  ir.emit("LOAD_FIELD", node.field);  // load field
  break;
}

case "FieldAssignment": {
  let className = null;

  // Case 1: ClassName.field = value
  if (
    node.object.type === "Identifier" &&
    classTable[node.object.name]
  ) {
    className = node.object.name;
  }

  // Case 2: instance.field = value → resolve via current class
  if (!className) {
    className = currentClass;
  }

  const fields = classTable[className] || [];
  const field = fields.find(f => f.name === node.field);

  // STATIC FIELD assignment (via class OR via instance)
  if (field && field.isStatic) {
    gen(node.value, scope, context);
    ir.emit("STORE_STATIC", { class: className, field: node.field });
    break;
  }

  // INSTANCE FIELD assignment
  gen(node.object, scope, context);   // push object
  gen(node.value, scope, context);    // push value
  ir.emit("STORE_FIELD", node.field);
  break;
}


 case "UpdateExpression": {
  const name = node.name;
  const isLocal = scope && scope.has(name);
  let op = (node.operator === TOKENS.INCREMENT) ? "ADD" : "SUB";

  if (isLocal || currentMethodIsStatic) {
    ir.emit("LOAD_VAR", name);
    ir.emit("LOAD_CONST", 1);
    ir.emit(op);
    ir.emit("STORE_VAR", name);
  } else {
    // Instance field ++/-- : push object first, dup, load field
    ir.emit("LOAD_THIS");
    ir.emit("DUP");
    ir.emit("LOAD_FIELD", name);
    ir.emit("LOAD_CONST", 1);
    ir.emit(op);
    ir.emit("STORE_FIELD", name);
  }

  break;
}
      case "TernaryExpression": {
        gen(node.condition, scope, context);
        const jf = ir.emit("JUMP_IF_FALSE", null);
        gen(node.trueExpr, scope, context);
        const jend = ir.emit("JUMP", null);
        ir.patch(jf, ir.instructions.length);
        gen(node.falseExpr, scope, context);
        ir.patch(jend, ir.instructions.length);
        break;
      }

      case "UnaryExpression":
        gen(node.argument, scope, context);
        if (node.operator === TOKENS.NOT) {
          ir.emit("LOAD_CONST", 0);
          ir.emit("EQ");
        } else if (node.operator === TOKENS.BIT_NOT) {
          ir.emit("BIT_NOT");
        }
        break;

      case "LogicalExpression": {
  if (node.operator === "&&") {
    // left
    gen(node.left, scope, context);

    // if left == false → jump to falseCase
    const jf = ir.emit("JUMP_IF_FALSE", null);

    // left == true → evaluate right
    gen(node.right, scope, context);
    const jend = ir.emit("JUMP", null);

    // falseCase: result = 0
    ir.patch(jf, ir.instructions.length);
    ir.emit("LOAD_CONST", 0);

    // end
    ir.patch(jend, ir.instructions.length);
  }

  else if (node.operator === "||") {
    // left
    gen(node.left, scope, context);

    // if left == false → evaluate right
    const jf = ir.emit("JUMP_IF_FALSE", null);

    // left == true → result = 1
    ir.emit("LOAD_CONST", 1);
    const jend = ir.emit("JUMP", null);

    // falseCase: evaluate right
    ir.patch(jf, ir.instructions.length);
    gen(node.right, scope, context);

    // end
    ir.patch(jend, ir.instructions.length);
  }

  break;
}
case "DoWhileStatement": {
  const loopStart = ir.instructions.length;

  breakStack.push([]);
  continueStack.push(null); // will be patched to condition

  // body (runs at least once)
  gen(node.body, scope, context);

  const condStart = ir.instructions.length;
  continueStack[continueStack.length - 1] = condStart;

  gen(node.test, scope, context);
  const jf = ir.emit("JUMP_IF_FALSE", null);
  ir.emit("JUMP", loopStart);

  const loopEnd = ir.instructions.length;
  ir.patch(jf, loopEnd);

  for (const b of breakStack.pop()) ir.patch(b, loopEnd);
  continueStack.pop();
  break;
}
    case "SwitchStatement": {
        const endLabel = `switch_end_${labelCounter++}`;
        switchEndStack.push(endLabel);

        for (const caseClause of node.cases) {
          const failLabel = `case_fail_${labelCounter++}`;
          gen(node.discriminant, scope, context);
          gen(caseClause.value, scope, context);
          ir.emit("EQ");
          ir.emit("JUMP_IF_FALSE", failLabel);
          gen(caseClause.body, scope, context);
          ir.emit("LABEL", failLabel);
        }

        if (node.defaultCase) {
          gen(node.defaultCase, scope, context);
        }

        ir.emit("LABEL", endLabel);
        switchEndStack.pop();
        break;
      }

      case "BinaryExpression":
        gen(node.left, scope, context);
        gen(node.right, scope, context);
        switch (node.operator) {
         case TOKENS.PLUS: {
  function isStringExpr(node) {
    // literal string
    if (node.type === "StringLiteral") return true;

    // variable: check declared type in class fields
    if (node.type === "Identifier") {
      // local variable → numeric
      if (scope && scope.has(node.name)) return false;

      // field → check class table
      const fields = classTable[currentClass] || [];
      const f = fields.find(x => x.name === node.name);
      return f && f.type === "String";
    }

    // field access: obj.field
    if (node.type === "FieldAccess") {
      const objType =
        node.object.type === "Identifier" &&
        classTable[node.object.name]
          ? node.object.name
          : currentClass;

      const fields = classTable[objType] || [];
      const f = fields.find(x => x.name === node.field);
      return f && f.type === "String";
    }

    return false;
  }

  if (isStringExpr(node.left) || isStringExpr(node.right)) {
    ir.emit("STRING_CONCAT");
  } else {
    ir.emit("ADD");
  }
  break;
}


           

          case TOKENS.MINUS: ir.emit("SUB"); break;
          case TOKENS.STAR: ir.emit("MUL"); break;
          case TOKENS.SLASH: ir.emit("DIV"); break;
          case TOKENS.PERCENT: ir.emit("MOD"); break;
          case TOKENS.GT: ir.emit("GT"); break;
          case TOKENS.LT: ir.emit("LT"); break;
          case TOKENS.GE: ir.emit("GE"); break;
          case TOKENS.LE: ir.emit("LE"); break;
          case TOKENS.EQ: ir.emit("EQ"); break;
          case TOKENS.NE: ir.emit("NE"); break;
          case TOKENS.BIT_AND: ir.emit("BIT_AND"); break;
          case TOKENS.BIT_OR: ir.emit("BIT_OR"); break;
          case TOKENS.BIT_XOR: ir.emit("BIT_XOR"); break;
          case TOKENS.SHIFT_LEFT: ir.emit("SHL"); break;
          case TOKENS.SHIFT_RIGHT: ir.emit("SHR"); break;
          default:
            throw new Error("Unknown binary operator: " + node.operator);
        }
        break;

      case "IfStatement": {
        gen(node.condition, scope, context);
        const jf = ir.emit("JUMP_IF_FALSE", null);
        gen(node.thenBody, scope, context);
        let je = null;
        if (node.elseBody) je = ir.emit("JUMP", null);
        ir.patch(jf, ir.instructions.length);
        if (node.elseBody) {
          gen(node.elseBody, scope, context);
          ir.patch(je, ir.instructions.length);
        }
        break;
      }

      case "WhileStatement": {
        const loopStart = ir.instructions.length;
        gen(node.test, scope, context);
        const jf = ir.emit("JUMP_IF_FALSE", null);
        breakStack.push([]);
        continueStack.push(loopStart);
        gen(node.body, scope, context);
        ir.emit("JUMP", loopStart);
        const loopEnd = ir.instructions.length;
        ir.patch(jf, loopEnd);
        for (const b of breakStack.pop()) ir.patch(b, loopEnd);
        continueStack.pop();
        break;
      }
      
      // v4.4: Enhanced for-each loop
      case "ForEachStatement": {
        // Generate collection expression and get iterator
        gen(node.collection, scope, context);
        
        // Call iterator() method on the collection
        // The collection type will determine which iterator() method to call
        // For ArrayList: call ArrayList.iterator()
        // For HashMap: call HashMap.iterator()
        // We need to determine the collection type from the expression
        const collectionType = inferExprType(node.collection, scope, context);
        
        // Push arguments (collection is already on stack from gen(node.collection, ...))
        // For instance method calls, we need the receiver (collection) on stack
        // Then push arguments (none for iterator())
        // argc = 1 (this/receiver) + 0 (no args) = 1
        
        // Generate method call using CALL_VIRTUAL
        // The method resolution will find the correct iterator() based on collection type
        ir.emit("CALL_VIRTUAL", {
          methodName: "iterator",
          className: collectionType,
          argc: 1, // this (the collection)
          paramCount: 0
        });
        
        // Store iterator in a temporary variable
        const iteratorVar = `__iter_${labelCounter++}`;
        ir.emit("STORE_VAR", iteratorVar);
        scope.add(iteratorVar);
        
        // Declare loop variable
        scope.add(node.varName);
        
        // Loop start
        const loopStart = ir.instructions.length;
        breakStack.push([]);
        continueStack.push(loopStart);
        
        // Check hasNext()
        ir.emit("LOAD_VAR", iteratorVar);
        ir.emit("CALL_VIRTUAL", {
          methodName: "hasNext",
          className: "Iterator",
          argc: 1,
          paramCount: 0
        });
        
        const jf = ir.emit("JUMP_IF_FALSE", null);
        
        // Get next element and store in loop variable
        ir.emit("LOAD_VAR", iteratorVar);
        ir.emit("CALL_VIRTUAL", {
          methodName: "next",
          className: "Iterator",
          argc: 1,
          paramCount: 0
        });
        ir.emit("STORE_VAR", node.varName);
        
        // Execute loop body
        gen(node.body, scope, context);
        
        // Jump back to loop start
        ir.emit("JUMP", loopStart);
        
        // Loop end
        const loopEnd = ir.instructions.length;
        ir.patch(jf, loopEnd);
        for (const b of breakStack.pop()) ir.patch(b, loopEnd);
        continueStack.pop();
        
        // Remove iterator variable from scope
        scope.delete(iteratorVar);
        scope.delete(node.varName);
        
        break;
      }

      case "ForStatement": {
        // v1.0: Classic for loop: for (init; test; update) body
        // Generate: init; L1: if (!test) goto L2; body; update; goto L1; L2:
        
        // Generate init statement
        if (node.init) {
          if (node.init.type === "VarDeclaration") {
            scope.add(node.init.name);
            if (node.init.value) {
              gen(node.init.value, scope, context);
              ir.emit("STORE_VAR", node.init.name);
            }
          } else {
            gen(node.init, scope, context);
          }
        }
        
        // Loop start label
        const loopStart = ir.instructions.length;
        breakStack.push([]);
        continueStack.push(loopStart);
        
        // Generate test condition
        let jf = null;
        if (node.test) {
          gen(node.test, scope, context);
          jf = ir.emit("JUMP_IF_FALSE", null);
        }
        
        // Generate body
        gen(node.body, scope, context);
        
        // Generate update
        if (node.update) {
          gen(node.update, scope, context);
        }
        
        // Jump back to loop start
        ir.emit("JUMP", loopStart);
        
        // Loop end label
        const loopEnd = ir.instructions.length;
        if (jf !== null) {
          ir.patch(jf, loopEnd);
        }
        
        // Patch break statements
        for (const b of breakStack.pop()) ir.patch(b, loopEnd);
        continueStack.pop();
        
        // Remove loop variable from scope
        if (node.init && node.init.type === "VarDeclaration") {
          scope.delete(node.init.name);
        }
        
        break;
      }

      case "BreakStatement": {
        if (switchEndStack.length > 0) {
          ir.emit("JUMP", switchEndStack[switchEndStack.length - 1]);
        } else {
          const j = ir.emit("JUMP", null);
          breakStack[breakStack.length - 1].push(j);
        }
        break;
      }

      case "ContinueStatement":
        ir.emit("JUMP", continueStack[continueStack.length - 1]);
        break;

      case "ArrayDeclaration":
        gen(node.size, scope, context);
        ir.emit("NEW_ARRAY");
        ir.emit("STORE_VAR", node.name);
        scope.add(node.name);
        break;

      case "ArrayAccess":
        ir.emit("LOAD_VAR", node.name);
        gen(node.index, scope, context);
        ir.emit("ARRAY_GET");
        break;

      case "ArrayAssignment":
        ir.emit("LOAD_VAR", node.name);
        gen(node.index, scope, context);
        gen(node.value, scope, context);
        ir.emit("ARRAY_SET");
        break;

      case "ArrayLength":
        gen(node.array, scope, context);
        ir.emit("ARRAY_LENGTH");
        break;

    case "CallExpression": {
  // Special case: string.equals
  if (node.callee === "equals") {
    gen(node.arguments[0], scope, context);
    gen(node.arguments[1], scope, context);
    ir.emit("STRING_EQUALS");
    break;
  }

  let isStaticCall = false;
  let classNameForCall = mainClassName;
  let methodName;

  // v7.1: Handle super() calls
  if (node.callee.type === "Identifier" && node.callee.name === "super") {
    // super() call - just skip it in IR generation (parent constructor already called)
    break;
  }

  // Determine if this is ClassName.method() or obj.method() or legacy direct call
  if (node.callee.type === "FieldAccess") {
    const obj = node.callee.object;
    if (obj.type === "Identifier" && classTable[obj.name]) {
      // Static method call: Counter.increment()
      isStaticCall = true;
      classNameForCall = obj.name;           // ← important: use the actual class name
      methodName = node.callee.field;
      // Do NOT push receiver for static calls
    } else {
      // Instance method call
      gen(obj, scope, context);  // push the receiver
      methodName = node.callee.field;
    }
  } else if (node.callee.type === "Identifier") {
    // Legacy / direct call: increment() → treat as static in current class
    isStaticCall = true;
    methodName = node.callee.name;
  } else {
    throw new Error(`Unsupported callee: ${JSON.stringify(node.callee)}`);
  }

  // Push arguments
  for (const arg of node.arguments) {
    gen(arg, scope, context);
  }

  // argc = number of arguments + 1 if instance method (for this)
  let argc = node.arguments.length;
  if (!isStaticCall) {
    argc += 1;  // + this
  }

  // Generate correct method label
 // ------------------------------
// v2.7 STEP 4 — Type-based overload resolution
// v4.0: Check inheritance chain
// ------------------------------
const argTypes = node.arguments.map(arg =>
  inferExprType(arg, scope, context)
);

const signature = argTypes.join(",");
const aritySignature = `$arity:${node.arguments.length}`;

// Determine which class to search in
let searchClass = classNameForCall;
if (!isStaticCall) {
  // For instance methods, try to infer the class from the receiver
  if (node.callee.type === "FieldAccess") {
    const objType = inferExprType(node.callee.object, scope, context);
    if (typeof objType === "string" && objType !== "INT" && objType !== "STRING" && objType !== "BOOLEAN") {
      searchClass = objType;
    }
  }
}

// Try type-based signature first (for v2.6+ overload resolution)
let entry = methods[methodName] && methods[methodName][signature] 
  ? methods[methodName][signature] 
  : null;

// Fall back to arity-based signature (for v0.8-v2.5 compatibility)
if (!entry && methods[methodName]) {
  entry = methods[methodName][aritySignature];
}

// v4.0: If not found, search inheritance chain
if (!entry && !isStaticCall) {
  entry = findMethodInHierarchy(searchClass, methodName, aritySignature);
  if (!entry) {
    entry = findMethodInHierarchy(searchClass, methodName, signature);
  }
}

if (!entry) {
  throw new Error(
    `CompileError: no matching method ${methodName}(${signature}) in class ${searchClass} or its superclasses`
  );
}

// Generate label based on which signature matched
const paramCount = node.arguments.length;
const key = `${entry.className}.${methodName}`;
let label;

// v4.3: Special handling for iterator() method - use receiver type to determine correct class
if (methodName === "iterator" && !isStaticCall && node.callee.type === "FieldAccess") {
  const receiverType = inferExprType(node.callee.object, scope, context);
  if (receiverType === "ArrayList" || receiverType === "HashMap") {
    // Use receiver type directly for iterator() calls
    label = `method_${receiverType}_iterator`;
  } else {
    // Fall back to normal resolution
    if (entry === methods[methodName][aritySignature]) {
      label = overloadCounts[key] === 1
        ? `method_${entry.className}_${methodName}`
        : `method_${entry.className}_${methodName}_${paramCount}`;
    } else {
      label = `method_${entry.className}_${methodName}#${signature}`;
    }
  }
} else {
  // Normal method resolution
  if (entry === methods[methodName][aritySignature]) {
    // Used arity-based lookup - use arity-based label format
    label = overloadCounts[key] === 1
      ? `method_${entry.className}_${methodName}`
      : `method_${entry.className}_${methodName}_${paramCount}`;
  } else {
    // Used type-based lookup - use type-based label format
    label = `method_${entry.className}_${methodName}#${signature}`;
  }
}

// v4.0: Use CALL_VIRTUAL for instance methods to enable dynamic dispatch
if (!isStaticCall) {
  ir.emit("CALL_VIRTUAL", { 
    methodName, 
    className: entry.className, 
    argc, 
    paramCount: node.arguments.length 
  });
} else {
ir.emit("CALL", { name: label, argc });
}

  break;
}

      case "ReturnStatement":
  gen(node.value, scope, context);
  ir.emit("RETURN_VAL");
  context.hasReturn = true;
  break;

      case "AssertionStatement": {
        if (node.kind === "trap") {
          ir.emit("LOAD_CONST", node.payload);
          ir.emit("TRAP");
          break;
        }
        const failLabel = `assert_fail_${labelCounter++}`;
        const okLabel = `assert_ok_${labelCounter++}`;
        gen(node.payload, scope, context);
        ir.emit("JUMP_IF_FALSE", failLabel);
        ir.emit("JUMP", okLabel);
        ir.emit("LABEL", failLabel);
        ir.emit("LOAD_CONST", node.kind.toUpperCase() + " failed");
        ir.emit("PRINT");
        ir.emit("HALT");
        ir.emit("LABEL", okLabel);
        break;
      }

      default:
        throw new Error("Unknown AST node: " + node.type);
    }
  }

  // Initialize all static fields (run once at program start)
let scope = new Set();
let context = {};
for (const className in classTable) {
  const fields = classTable[className];
  for (const field of fields) {
    if (field.isStatic) {
      if (field.init) {
        gen(field.init, scope, context);
        ir.emit("STORE_STATIC", { class: className, field: field.name });
      } else {
        // No initializer → default to 0
        ir.emit("LOAD_CONST", 0);
        ir.emit("STORE_STATIC", { class: className, field: field.name });
      }
    }
  }
}

 // EMIT MAIN BODY DIRECTLY (entry point)
currentMethodIsStatic = true;
currentClass = mainClassName;   // ✅ FIX: set class context for main

for (const s of ast.body) {
  if (
    s.type !== "ClassDeclaration" &&
    s.type !== "MethodDeclaration" &&
    s.type !== "ConstructorDeclaration"
  ) {
    gen(s, scope, context);
  }
}
ir.emit("HALT");


  // EMIT CONSTRUCTORS first
  for (const className in constructorTable) {
    const c = constructorTable[className];
    if (!c) continue;
    
  ir.emit("FUNC_LABEL", `ctor_${className}`);
ir.emit("ENTER", 1 + c.params.length);

// bind this
ir.emit("LOAD_VAR", "$0");
ir.emit("STORE_VAR", "this");

// v4.2: Special handling for ArrayList and HashMap - allocate heap storage
// v4.5: Special handling for StringBuilder - allocate heap storage
if (className === "ArrayList") {
  ir.emit("LOAD_VAR", "this");
  ir.emit("NEW_ARRAYLIST");
  ir.emit("STORE_FIELD", "__heapId");
} else if (className === "HashMap") {
  ir.emit("LOAD_VAR", "this");
  ir.emit("NEW_HASHMAP");
  ir.emit("STORE_FIELD", "__heapId");
} else if (className === "StringBuilder") {
  ir.emit("LOAD_VAR", "this");
  ir.emit("NEW_STRINGBUILDER");
  ir.emit("STORE_FIELD", "__heapId");
}

// bind constructor parameters
for (let i = 0; i < c.params.length; i++) {
  ir.emit("LOAD_VAR", `$${i + 1}`);
  ir.emit("STORE_VAR", c.params[i]);
}

let scope = new Set(c.params);
scope.add("this");

let context = {};
currentMethodIsStatic = false;
currentFrameHasThis = () => true;

// constructor body
for (const s of c.body) gen(s, scope, context);

// return this
ir.emit("LOAD_VAR", "this");
ir.emit("RETURN_VAL");

  }

    // EMIT METHODS second
 for (const name in methods) {for (const signature in methods[name]) {
  const entry = methods[name][signature];
    const m = entry.method;
    const ownerClass = entry.className;


const paramCount = m.params.length;

const key = `${ownerClass}.${name}`;
const label =
  overloadCounts[key] === 1
    ? `method_${ownerClass}_${name}`
    : `method_${ownerClass}_${name}_${paramCount}`;

ir.emit("FUNC_LABEL", label);

currentMethodIsStatic = m.isStatic;
currentClass = ownerClass;


   const frameSize = m.params.length + (m.isStatic ? 0 : 1);
ir.emit("ENTER", frameSize);
let scope = new Set(m.params);
let context = { hasReturn: false };

if (!m.isStatic) {
  // bind this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  scope.add("this");

  // bind instance params: $1, $2, ...
  for (let i = 0; i < m.params.length; i++) {
    ir.emit("LOAD_VAR", `$${i + 1}`);
    ir.emit("STORE_VAR", m.params[i]);
  }
} else {
  // bind static params: $0, $1, ...
  for (let i = 0; i < m.params.length; i++) {
    ir.emit("LOAD_VAR", `$${i}`);
    ir.emit("STORE_VAR", m.params[i]);
  }
}



    const prevThisAllowed = currentFrameHasThis();  
    const originalThisAllowed = currentFrameHasThis;  
    currentFrameHasThis = function() { return !m.isStatic; };
    
    for (const s of m.body) gen(s, scope, context);
    currentFrameHasThis = originalThisAllowed;

   if (!context.hasReturn) {
  ir.emit("LOAD_CONST", 0);
  ir.emit("RETURN_VAL");
}

  }}
  
  // v4.0: EMIT OBJECT CLASS METHODS (built-in base class)
  // Object.toString() - returns String representation
  ir.emit("FUNC_LABEL", "method_Object_toString");
  ir.emit("ENTER", 1); // this parameter
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  // Default toString: return class name as string (e.g., "Dog", "Cat")
  // Get class name from object's __class property and convert to string
  ir.emit("LOAD_VAR", "this");
  ir.emit("OBJECT_TO_STRING");
  ir.emit("RETURN_VAL");
  
  // Object.equals(Object other) - returns int (1 for true, 0 for false)
  ir.emit("FUNC_LABEL", "method_Object_equals_1");
  ir.emit("ENTER", 2); // this + other parameter
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "$1");
  ir.emit("STORE_VAR", "other");
  // Default equals: reference equality (same object)
  ir.emit("LOAD_VAR", "this");
  ir.emit("LOAD_VAR", "other");
  ir.emit("OBJECT_EQUALS");
  ir.emit("RETURN_VAL");
  
  // Object.hashCode() - returns int
  ir.emit("FUNC_LABEL", "method_Object_hashCode");
  ir.emit("ENTER", 1); // this parameter
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  // Default hashCode: use object identity (simple hash of object reference)
  ir.emit("LOAD_VAR", "this");
  ir.emit("OBJECT_HASH_CODE");
  ir.emit("RETURN_VAL");
  
  // v4.2: EMIT ARRAYLIST METHODS
  // ArrayList.add(Object element) - returns void
  ir.emit("FUNC_LABEL", "method_ArrayList_add_1");
  ir.emit("ENTER", 2); // this + element
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "$1");
  ir.emit("STORE_VAR", "element");
  ir.emit("LOAD_VAR", "this");
  ir.emit("LOAD_VAR", "element");
  ir.emit("ARRAYLIST_ADD");
  ir.emit("LOAD_CONST", 0); // void return
  ir.emit("RETURN_VAL");
  
  // ArrayList.get(int index) - returns Object
  ir.emit("FUNC_LABEL", "method_ArrayList_get_1");
  ir.emit("ENTER", 2); // this + index
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "$1");
  ir.emit("STORE_VAR", "index");
  ir.emit("LOAD_VAR", "this");
  ir.emit("LOAD_VAR", "index");
  ir.emit("ARRAYLIST_GET");
  ir.emit("RETURN_VAL");
  
  // ArrayList.size() - returns int
  ir.emit("FUNC_LABEL", "method_ArrayList_size");
  ir.emit("ENTER", 1); // this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "this");
  ir.emit("ARRAYLIST_SIZE");
  ir.emit("RETURN_VAL");
  
  // v4.3: ArrayList.iterator() - returns Iterator
  ir.emit("FUNC_LABEL", "method_ArrayList_iterator");
  ir.emit("ENTER", 1); // this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "this");
  ir.emit("ARRAYLIST_ITERATOR");
  ir.emit("RETURN_VAL");
  
  // v4.2: EMIT HASHMAP METHODS
  // HashMap.put(Object key, Object value) - returns void
  ir.emit("FUNC_LABEL", "method_HashMap_put_2");
  ir.emit("ENTER", 3); // this + key + value
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "$1");
  ir.emit("STORE_VAR", "key");
  ir.emit("LOAD_VAR", "$2");
  ir.emit("STORE_VAR", "value");
  ir.emit("LOAD_VAR", "this");
  ir.emit("LOAD_VAR", "key");
  ir.emit("LOAD_VAR", "value");
  ir.emit("HASHMAP_PUT");
  ir.emit("LOAD_CONST", 0); // void return
  ir.emit("RETURN_VAL");
  
  // HashMap.get(Object key) - returns Object
  ir.emit("FUNC_LABEL", "method_HashMap_get_1");
  ir.emit("ENTER", 2); // this + key
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "$1");
  ir.emit("STORE_VAR", "key");
  ir.emit("LOAD_VAR", "this");
  ir.emit("LOAD_VAR", "key");
  ir.emit("HASHMAP_GET");
  ir.emit("RETURN_VAL");
  
  // HashMap.containsKey(Object key) - returns int
  ir.emit("FUNC_LABEL", "method_HashMap_containsKey_1");
  ir.emit("ENTER", 2); // this + key
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "$1");
  ir.emit("STORE_VAR", "key");
  ir.emit("LOAD_VAR", "this");
  ir.emit("LOAD_VAR", "key");
  ir.emit("HASHMAP_CONTAINS_KEY");
  ir.emit("RETURN_VAL");
  
  // HashMap.size() - returns int
  ir.emit("FUNC_LABEL", "method_HashMap_size");
  ir.emit("ENTER", 1); // this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "this");
  ir.emit("HASHMAP_SIZE");
  ir.emit("RETURN_VAL");
  
  // v4.3: HashMap.iterator() - returns Iterator
  ir.emit("FUNC_LABEL", "method_HashMap_iterator");
  ir.emit("ENTER", 1); // this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "this");
  ir.emit("HASHMAP_ITERATOR");
  ir.emit("RETURN_VAL");
  
  // v4.3: EMIT ITERATOR METHODS
  // Iterator.hasNext() - returns int
  ir.emit("FUNC_LABEL", "method_Iterator_hasNext");
  ir.emit("ENTER", 1); // this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "this");
  ir.emit("ITERATOR_HAS_NEXT");
  ir.emit("RETURN_VAL");
  
  // Iterator.next() - returns Object
  ir.emit("FUNC_LABEL", "method_Iterator_next");
  ir.emit("ENTER", 1); // this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "this");
  ir.emit("ITERATOR_NEXT");
  ir.emit("RETURN_VAL");
  
  // v4.5: EMIT STRINGBUILDER METHODS
  // StringBuilder.append(Object value) - returns StringBuilder
  ir.emit("FUNC_LABEL", "method_StringBuilder_append_1");
  ir.emit("ENTER", 2); // this + value
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "$1");
  ir.emit("STORE_VAR", "value");
  ir.emit("LOAD_VAR", "this");
  ir.emit("LOAD_VAR", "value");
  ir.emit("STRINGBUILDER_APPEND");
  ir.emit("LOAD_VAR", "this");
  ir.emit("RETURN_VAL");
  
  // StringBuilder.toString() - returns String
  ir.emit("FUNC_LABEL", "method_StringBuilder_toString");
  ir.emit("ENTER", 1); // this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "this");
  ir.emit("STRINGBUILDER_TO_STRING");
  ir.emit("RETURN_VAL");
  
  // StringBuilder.length() - returns int
  ir.emit("FUNC_LABEL", "method_StringBuilder_length");
  ir.emit("ENTER", 1); // this
  ir.emit("LOAD_VAR", "$0");
  ir.emit("STORE_VAR", "this");
  ir.emit("LOAD_VAR", "this");
  ir.emit("STRINGBUILDER_LENGTH");
  ir.emit("RETURN_VAL");

  return ir;
}

module.exports = generateIR;