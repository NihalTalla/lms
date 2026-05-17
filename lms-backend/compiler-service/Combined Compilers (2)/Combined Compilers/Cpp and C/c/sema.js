// compiler/c/sema.js
// Semantic analysis for the C front-end.
// Responsibilities:
// - Build symbol tables (globals + nested scopes)
// - Resolve and canonicalize types (using compiler/c/types.js)
// - Resolve struct layouts (field -> index)
// - Type-check expressions/statements
// - Enforce lvalues for assignment / address-of
// - Validate function prototypes/definitions + return types
//
// This pass decorates AST nodes with:
//   - node.inferredType : CType
//   - IdentifierExpr.symbol : Symbol
//   - VarDecl.symbol : VarSymbol
//   - FunctionDecl.symbol : FuncSymbol
//   - MemberExpr.fieldIndex : number
//   - MemberExpr.structType : StructType (canonical)

const AST = require("./ast");
const Types = require("./types");
const builtins = require("./builtins");

function semaError(msg, nodeOrTok) {
  const loc = nodeOrTok && nodeOrTok.loc ? nodeOrTok.loc : null;
  const where = loc ? `${loc.line}:${loc.column}` : `?:?`;
  return new Error(`SEMA ERROR: ${msg}\n  at ${where}`);
}

// ------------------------------
// Symbols
// ------------------------------
class SymbolBase {
  constructor(kind, name, type, declNode) {
    this.kind = kind; // "var" | "func" | "struct"
    this.name = name;
    this.type = type; // CType (or StructType for struct symbol)
    this.decl = declNode || null;
  }
}

class VarSymbol extends SymbolBase {
  constructor(name, type, declNode, isGlobal) {
    super("var", name, type, declNode);
    this.isGlobal = !!isGlobal;
  }
}

class FuncSymbol extends SymbolBase {
  constructor(name, type, declNode) {
    super("func", name, type, declNode);
    // type will be a small record: { kind:"func", ret:CType, params:CType[] }
    this.isDefined = false;
    this.paramNames = [];
  }
}

class StructSymbol extends SymbolBase {
  constructor(name, structType, declNode) {
    super("struct", name, structType, declNode);
  }
}

// ------------------------------
// Function type record (simple)
// ------------------------------
function makeFuncType(ret, params) {
  return { kind: "func", ret, params };
}

function sameFuncType(a, b) {
  if (!a || !b) return false;
  if (a.kind !== "func" || b.kind !== "func") return false;
  if (!Types.sameType(a.ret, b.ret)) return false;
  if (a.params.length !== b.params.length) return false;
  for (let i = 0; i < a.params.length; i++) {
    if (!Types.sameType(a.params[i], b.params[i])) return false;
  }
  return true;
}

// ------------------------------
// Scope
// ------------------------------
class Scope {
  constructor(parent = null) {
    this.parent = parent;
    this.map = new Map(); // name -> SymbolBase
  }

  define(sym) {
    if (this.map.has(sym.name)) return false;
    this.map.set(sym.name, sym);
    return true;
  }

  lookup(name) {
    for (let s = this; s; s = s.parent) {
      const v = s.map.get(name);
      if (v) return v;
    }
    return null;
  }

  lookupHere(name) {
    return this.map.get(name) || null;
  }
}

// ------------------------------
// Analyzer
// ------------------------------
class SemanticAnalyzer {
  constructor() {
    this.tf = new Types.TypeFactory();

    this.globalScope = new Scope(null);
    this.structs = new Map();   // tag -> StructSymbol
    this.funcs = new Map();     // name -> FuncSymbol
    this.globals = new Map();   // name -> VarSymbol
    this.typedefs = new Map();  // name -> CType
    this.enums = new Map();     // tag -> EnumSymbol

    this._currentFunc = null;
    this._loopDepth = 0;
    this._labels = new Map();   // label -> address (for goto)
  }

  analyze(program) {
    if (!program || program.kind !== "Program") {
      throw new Error("Internal: sema expects Program node");
    }
    // Register builtins before any user declarations/bodies are checked.
    builtins.registerBuiltins({
    tf: this.tf,
    globalScope: this.globalScope,
    funcs: this.funcs,
    FuncSymbol: FuncSymbol,
    });
    // Pass 1: collect typedefs, enums, struct tags (declare) + function prototypes + globals
    for (const d of program.decls) {
      if (d.kind === "TypedefDecl") {
        this._declareTypedef(d);
      } else if (d.kind === "EnumDecl") {
        this._declareEnum(d);
      } else if (d.kind === "StructDecl") {
        this._declareStructTag(d);
      }
    }

    // Pass 1b: resolve struct layouts (now that tags exist)
    for (const d of program.decls) {
      if (d.kind === "StructDecl") {
        this._defineStructLayout(d);
      }
    }

    // Pass 2: declare funcs/globals (types only), validate duplicates
    for (const d of program.decls) {
      if (d.kind === "FunctionDecl") {
        this._declareFunction(d);
      } else if (d.kind === "VarDecl") {
        this._declareGlobalVar(d);
      } else if (d.kind === "StructDecl" || d.kind === "TypedefDecl" || d.kind === "EnumDecl") {
        // already handled
      } else {
        throw semaError(`Unknown top-level declaration kind: ${d.kind}`, d);
      }
    }

    // Pass 3: type-check global initializers + function bodies
    for (const d of program.decls) {
      if (d.kind === "VarDecl") {
        this._checkGlobalVarInit(d);
      } else if (d.kind === "FunctionDecl") {
        if (!d.isPrototype) {
          this._checkFunctionBody(d);
        }
      }
    }
    


    return {
      program,
      tf: this.tf,
      globalScope: this.globalScope,
      structs: this.structs,
      funcs: this.funcs,
      globals: this.globals,
    };
  }

  // --------------------------
  // Typedefs
  // --------------------------
  _declareTypedef(td) {
    const name = td.name;
    if (this.typedefs.has(name) || this.globals.has(name) || this.funcs.has(name) || this.structs.has(name)) {
      throw semaError(`Duplicate symbol '${name}'`, td);
    }
    const t = this._resolveTypeNode(td.type);
    this.typedefs.set(name, t);
    // Also add to global scope as a type name
    const sym = new SymbolBase("typedef", name, t, td);
    if (!this.globalScope.define(sym)) {
      throw semaError(`Duplicate global symbol '${name}'`, td);
    }
    td.resolvedType = t;
  }

  // --------------------------
  // Enums
  // --------------------------
  _declareEnum(ed) {
    const tag = ed.name;
    if (this.enums.has(tag)) {
      throw semaError(`Duplicate enum tag '${tag}'`, ed);
    }
    // For now, treat enum as int
    const enumType = this.tf.int();
    const sym = new SymbolBase("enum", tag, enumType, ed);
    this.enums.set(tag, sym);
    if (!this.globalScope.define(sym)) {
      throw semaError(`Duplicate global symbol '${tag}'`, ed);
    }
    ed.resolvedType = enumType;
    
    // Register enum values as constants
    let nextValue = 0;
    for (const val of ed.values) {
      // Calculate enum value
      let enumVal;
      if (val.value) {
        enumVal = this._evalConstInt(val.value);
        if (enumVal != null) {
          nextValue = enumVal + 1;
        } else {
          enumVal = nextValue;
          nextValue++;
        }
      } else {
        enumVal = nextValue;
        nextValue++;
      }
      
      // Enum values are treated as integer constants
      if (!this.globals.has(val.name) && !this.globalScope.lookupHere(val.name)) {
        const valSym = new VarSymbol(val.name, enumType, null, true);
        valSym.isEnumValue = true;
        valSym.enumValue = enumVal;
        this.globals.set(val.name, valSym);
        this.globalScope.define(valSym);
      }
    }
  }

  // --------------------------
  // Structs
  // --------------------------
  _declareStructTag(sd) {
    const tag = sd.name;
    if (this.structs.has(tag)) {
      throw semaError(`Duplicate struct tag '${tag}'`, sd);
    }
    const st = this.tf.struct(tag);
    const sym = new StructSymbol(tag, st, sd);
    this.structs.set(tag, sym);
    if (!this.globalScope.define(sym)) {
      throw semaError(`Duplicate symbol '${tag}'`, sd);
    }
    sd.symbol = sym;
  }

  _defineStructLayout(sd) {
    const tag = sd.name;
    const sym = this.structs.get(tag);
    if (!sym) {
      throw semaError(`Internal: struct '${tag}' not declared`, sd);
    }
    const st = sym.type; // StructType
    if (st.isResolved()) {
      // allow only one definition
      // (in real C, could be forward-declared, but here StructDecl includes body)
      throw semaError(`Struct '${tag}' already defined`, sd);
    }

    const seen = new Set();
    const fields = [];
    for (const f of sd.fields) {
      if (seen.has(f.name)) {
        throw semaError(`Duplicate field '${f.name}' in struct '${tag}'`, f);
      }
      seen.add(f.name);

      const ft = this._resolveTypeNode(f.type);
      if (Types.isVoid(ft)) {
        throw semaError(`Field '${f.name}' in struct '${tag}' cannot have type void`, f);
      }
      fields.push({ name: f.name, type: ft });
      f.resolvedType = ft;
    }

    st.resolve(fields);
    sd.resolvedType = st;
  }

  // --------------------------
  // Top-level: globals & funcs
  // --------------------------
  _declareGlobalVar(vd) {
    const name = vd.name;
    if (this.globals.has(name) || this.funcs.has(name) || this.structs.has(name)) {
      throw semaError(`Duplicate global symbol '${name}'`, vd);
    }

    const t = this._resolveTypeNode(vd.type);
    if (Types.isVoid(t)) {
      throw semaError(`Global variable '${name}' cannot have type void`, vd);
    }

    const sym = new VarSymbol(name, t, vd, true);
    this.globals.set(name, sym);
    if (!this.globalScope.define(sym)) {
      throw semaError(`Duplicate global symbol '${name}'`, vd);
    }
    vd.symbol = sym;
  }

  _declareFunction(fd) {
    const name = fd.name;

    // Return + params
    const retT = this._resolveTypeNode(fd.returnType);

    const paramTypes = [];
    const paramNames = [];
    const seen = new Set();
    for (const p of fd.params) {
      const pt = this._resolveTypeNode(p.type);

      if (Types.isVoid(pt)) {
        throw semaError(`Parameter '${p.name}' in function '${name}' cannot have type void`, p);
      }
      if (seen.has(p.name)) {
        throw semaError(`Duplicate parameter name '${p.name}' in function '${name}'`, p);
      }
      seen.add(p.name);

      paramTypes.push(pt);
      paramNames.push(p.name);

      p.resolvedType = pt;
    }

    const ftype = makeFuncType(retT, paramTypes);

    const existing = this.funcs.get(name);
    if (!existing) {
      // cannot conflict with globals/struct tags
      if (this.globals.has(name) || this.structs.has(name)) {
        throw semaError(`Symbol '${name}' already declared as non-function`, fd);
      }

      const fs = new FuncSymbol(name, ftype, fd);
      fs.paramNames = paramNames.slice();
      fs.isDefined = !fd.isPrototype;
      this.funcs.set(name, fs);
      if (!this.globalScope.define(fs)) {
        throw semaError(`Duplicate global symbol '${name}'`, fd);
      }
      fd.symbol = fs;
      return;
    }

    // Existing function: prototype/definition compatibility checks
    if (!sameFuncType(existing.type, ftype)) {
      throw semaError(
        `Conflicting types for function '${name}' (prototype/definition mismatch)`,
        fd
      );
    }

    // If this is a definition and we already defined
    if (!fd.isPrototype) {
      if (existing.isDefined) {
        throw semaError(`Redefinition of function '${name}'`, fd);
      }
      existing.isDefined = true;
    }

    fd.symbol = existing;
  }

  _checkGlobalVarInit(vd) {
    const sym = vd.symbol;
    if (!vd.init) return;

    if (vd.init.kind === "InitializerList") {
      // Array initialization
      if (!Types.isArray(sym.type)) {
        throw semaError(`Initializer list can only be used with arrays`, vd);
      }
      const elemT = sym.type.base;
      for (const elem of vd.init.elements) {
        const elemType = this._checkExpr(elem, this.globalScope);
        if (!Types.isAssignable(elemT, elemType, this.tf)) {
          throw semaError(`Array initializer element type ${elemType} not compatible with ${elemT}`, elem);
        }
      }
    } else {
      const initT = this._checkExpr(vd.init, this.globalScope);
      if (!Types.isAssignable(sym.type, initT, this.tf)) {
        throw semaError(
          `Cannot initialize global '${vd.name}' of type ${sym.type} with value of type ${initT}`,
          vd
        );
      }
    }
  }

  // --------------------------
  // Function body checking
  // --------------------------
  _checkFunctionBody(fd) {
    const fs = fd.symbol;
    if (!fs) throw semaError(`Internal: function '${fd.name}' missing symbol`, fd);

    // New scope: global -> function -> blocks
    const funcScope = new Scope(this.globalScope);

    // Define params as locals
    for (let i = 0; i < fd.params.length; i++) {
      const p = fd.params[i];
      const name = p.name;
      const t = p.resolvedType || this._resolveTypeNode(p.type);
      const vs = new VarSymbol(name, t, p, false);
      if (!funcScope.define(vs)) {
        throw semaError(`Duplicate parameter '${name}'`, p);
      }
      p.symbol = vs;
    }

    const prevFunc = this._currentFunc;
    const prevLoop = this._loopDepth;
    this._currentFunc = fs;
    this._loopDepth = 0;

    this._checkStmt(fd.body, funcScope, fs.type.ret);

    this._currentFunc = prevFunc;
    this._loopDepth = prevLoop;
  }

  // --------------------------
  // Type resolution from AST type nodes
  // --------------------------
  _resolveTypeNode(typeNode) {
    if (!typeNode) throw new Error("Internal: missing type node");

    switch (typeNode.kind) {
      case "TypeName": {
        const n = typeNode.name;
        // Check typedefs first
        if (this.typedefs.has(n)) {
          return this.typedefs.get(n);
        }
        // Built-in types
        if (n === "int" || n === "unsigned int" || n === "unsigned") return this.tf.int();
        if (n === "long long" || n === "unsigned long long") return this.tf.int(); // Using int for now
        if (n === "short" || n === "unsigned short") return this.tf.int();
        if (n === "float") return this.tf.float();
        if (n === "void") return this.tf.void();
        if (n === "char" || n === "unsigned char") return this.tf.char();
        throw semaError(`Unknown type name '${n}'`, typeNode);
      }
      
      case "EnumType": {
        const tag = typeNode.name;
        if (!this.enums.has(tag)) {
          throw semaError(`Unknown enum type 'enum ${tag}'`, typeNode);
        }
        // Enums are treated as int
        return this.tf.int();
      }

      case "StructType": {
        const tag = typeNode.name;
        const st = this.tf.struct(tag); // intern even if not declared; we validate
        if (!this.structs.has(tag)) {
          throw semaError(`Unknown struct type 'struct ${tag}'`, typeNode);
        }
        return st;
      }

      case "PointerType": {
        const base = this._resolveTypeNode(typeNode.base);
        // void* is allowed
        return this.tf.ptr(base);
      }

      case "ArrayType": {
        // Phase 2+ support. For now we allow parsing but enforce size is absent or int literal.
        const base = this._resolveTypeNode(typeNode.base);
        if (Types.isVoid(base)) {
          throw semaError("Array element type cannot be void", typeNode);
        }
        let len = null;
        if (typeNode.sizeExpr) {
          const v = this._evalConstInt(typeNode.sizeExpr);
          if (v == null || v < 0) {
            throw semaError("Array size must be a non-negative constant integer", typeNode);
          }
          len = v;
        }
        return this.tf.arr(base, len);
      }

      default:
        throw semaError(`Unknown type node kind '${typeNode.kind}'`, typeNode);
    }
  }

  // --------------------------
  // Statements
  // --------------------------
  _checkStmt(stmt, scope, expectedRetType) {
    switch (stmt.kind) {
      case "BlockStmt": {
        const blockScope = new Scope(scope);
        for (const item of stmt.items) {
          if (item.kind === "VarDecl") {
            this._checkLocalVarDecl(item, blockScope);
          } else {
            this._checkStmt(item, blockScope, expectedRetType);
          }
        }
        return;
      }

      case "IfStmt": {
        const t = this._checkExpr(stmt.test, scope);
        // In C, any scalar can be condition; we accept numeric/pointer
        if (!Types.isNumeric(t) && !Types.isPointer(t)) {
          throw semaError(`If condition must be numeric or pointer, got ${t}`, stmt.test);
        }
        this._checkStmt(stmt.thenBranch, scope, expectedRetType);
        if (stmt.elseBranch) this._checkStmt(stmt.elseBranch, scope, expectedRetType);
        return;
      }

      case "WhileStmt": {
        const t = this._checkExpr(stmt.test, scope);
        if (!Types.isNumeric(t) && !Types.isPointer(t)) {
          throw semaError(`While condition must be numeric or pointer, got ${t}`, stmt.test);
        }
        this._loopDepth++;
        this._checkStmt(stmt.body, scope, expectedRetType);
        this._loopDepth--;
        return;
      }

      case "ForStmt": {
        const forScope = new Scope(scope);

        // init
        if (stmt.init) {
          if (stmt.init.kind === "VarDecl") this._checkLocalVarDecl(stmt.init, forScope);
          else this._checkStmt(stmt.init, forScope, expectedRetType); // ExprStmt
        }

        // test
        if (stmt.test) {
          const t = this._checkExpr(stmt.test, forScope);
          if (!Types.isNumeric(t) && !Types.isPointer(t)) {
            throw semaError(`For condition must be numeric or pointer, got ${t}`, stmt.test);
          }
        }

        // update
        if (stmt.update) {
          this._checkExpr(stmt.update, forScope);
        }

        this._loopDepth++;
        this._checkStmt(stmt.body, forScope, expectedRetType);
        this._loopDepth--;
        return;
      }

      case "SwitchStmt": {
        const switchScope = new Scope(scope);
        const testT = this._checkExpr(stmt.test, switchScope);
        if (!Types.isIntegral(testT)) {
          throw semaError(`Switch expression must be integral, got ${testT}`, stmt.test);
        }

        this._loopDepth++;
        for (const caseItem of stmt.cases) {
          const caseT = this._checkExpr(caseItem.value, switchScope);
          if (!Types.isAssignable(testT, caseT, this.tf)) {
            throw semaError(`Case value type ${caseT} not compatible with switch type ${testT}`, caseItem.value);
          }
          for (const caseStmt of caseItem.body) {
            this._checkStmt(caseStmt, switchScope, expectedRetType);
          }
        }
        if (stmt.defaultCase) {
          for (const defaultStmt of stmt.defaultCase) {
            this._checkStmt(defaultStmt, switchScope, expectedRetType);
          }
        }
        this._loopDepth--;
        return;
      }

      case "DoWhileStmt": {
        this._loopDepth++;
        this._checkStmt(stmt.body, scope, expectedRetType);
        const t = this._checkExpr(stmt.test, scope);
        if (!Types.isNumeric(t) && !Types.isPointer(t)) {
          throw semaError(`Do-while condition must be numeric or pointer, got ${t}`, stmt.test);
        }
        this._loopDepth--;
        return;
      }

      case "GotoStmt": {
        // Just record the goto; label validation happens later
        if (!this._labels.has(stmt.label)) {
          this._labels.set(stmt.label, null); // placeholder
        }
        return;
      }

      case "LabelStmt": {
        // Record label location
        this._labels.set(stmt.label, stmt);
        this._checkStmt(stmt.stmt, scope, expectedRetType);
        return;
      }

      case "ReturnStmt": {
        if (stmt.value == null) {
          if (!Types.isVoid(expectedRetType)) {
            throw semaError(`Return statement missing value for non-void function`, stmt);
          }
          return;
        }
        const vt = this._checkExpr(stmt.value, scope);
        if (Types.isVoid(expectedRetType)) {
          throw semaError(`Cannot return a value from void function`, stmt);
        }
        if (!Types.isAssignable(expectedRetType, vt, this.tf)) {
          throw semaError(
            `Return type mismatch: expected ${expectedRetType}, got ${vt}`,
            stmt.value
          );
        }
        return;
      }

      case "BreakStmt": {
        if (this._loopDepth <= 0) {
          throw semaError(`'break' not within a loop`, stmt);
        }
        return;
      }

      case "ContinueStmt": {
        if (this._loopDepth <= 0) {
          throw semaError(`'continue' not within a loop`, stmt);
        }
        return;
      }

      case "ExprStmt": {
        this._checkExpr(stmt.expr, scope);
        return;
      }

      default:
        throw semaError(`Unknown statement kind '${stmt.kind}'`, stmt);
    }
  }

  _checkLocalVarDecl(vd, scope) {
    const name = vd.name;
    if (scope.lookupHere(name)) {
      throw semaError(`Redeclaration of variable '${name}' in same scope`, vd);
    }

    const t = this._resolveTypeNode(vd.type);
    if (Types.isVoid(t)) {
      throw semaError(`Variable '${name}' cannot have type void`, vd);
    }

    const sym = new VarSymbol(name, t, vd, false);
    scope.define(sym);
    vd.symbol = sym;

    if (vd.init) {
      if (vd.init.kind === "InitializerList") {
        // Array initialization
        if (!Types.isArray(t)) {
          throw semaError(`Initializer list can only be used with arrays`, vd);
        }
        const elemT = t.base;
        for (const elem of vd.init.elements) {
          const elemType = this._checkExpr(elem, scope);
          if (!Types.isAssignable(elemT, elemType, this.tf)) {
            throw semaError(`Array initializer element type ${elemType} not compatible with ${elemT}`, elem);
          }
        }
      } else {
        const initT = this._checkExpr(vd.init, scope);
        // Allow 0/NULL to initialize pointers
        if (Types.isPointer(t) && Types.isIntegral(initT)) {
          // Check if it's zero
          if (vd.init.kind === "IntLiteralExpr" && parseInt(vd.init.value, 10) === 0) {
            // Allow 0 to initialize pointer (NULL)
          } else if (!Types.isAssignable(t, initT, this.tf)) {
            throw semaError(
              `Cannot initialize '${name}' of type ${t} with value of type ${initT}`,
              vd
            );
          }
        } else if (!Types.isAssignable(t, initT, this.tf)) {
          throw semaError(
            `Cannot initialize '${name}' of type ${t} with value of type ${initT}`,
            vd
          );
        }
      }
    }
  }

  // --------------------------
  // Expressions
  // --------------------------
  _checkExpr(expr, scope) {
    switch (expr.kind) {
      case "IntLiteralExpr": {
        expr.inferredType = this.tf.int();
        return expr.inferredType;
      }
      case "FloatLiteralExpr": {
        expr.inferredType = this.tf.float();
        return expr.inferredType;
      }
      case "CharLiteralExpr": {
        // treat char literal as char
        expr.inferredType = this.tf.char();
        return expr.inferredType;
      }
      case "StringLiteralExpr": {
        // Treat as pointer to char (C string literal)
        expr.inferredType = this.tf.ptr(this.tf.char());
        return expr.inferredType;
      }

      case "IdentifierExpr": {
        let sym = scope.lookup(expr.name);
        if (!sym) {
          sym = this.globalScope.lookup(expr.name);
        }
        // Also check globals map directly (for enum values)
        if (!sym && this.globals.has(expr.name)) {
          sym = this.globals.get(expr.name);
        }
        if (!sym) throw semaError(`Undefined identifier '${expr.name}'`, expr);
        if (sym.kind !== "var" && sym.kind !== "func") {
          throw semaError(`Identifier '${expr.name}' is not a value`, expr);
        }
        expr.symbol = sym;
        // Function identifier used as value: treat as function (callee checks in CallExpr)
        expr.inferredType = sym.kind === "var" ? sym.type : sym.type;
        return expr.inferredType;
      }

      case "UnaryExpr": {
        const t = this._checkExpr(expr.expr, scope);
        switch (expr.op) {
          case "!": {
            if (!Types.isNumeric(t) && !Types.isPointer(t)) {
              throw semaError(`Operator '!' requires numeric/pointer operand, got ${t}`, expr);
            }
            expr.inferredType = this.tf.int();
            return expr.inferredType;
          }
          case "-": {
            if (!Types.isNumeric(t)) {
              throw semaError(`Unary '-' requires numeric operand, got ${t}`, expr);
            }
            // int stays int, float stays float, char promotes to int
            expr.inferredType = Types.isPrimitive(t, "float") ? this.tf.float() : this.tf.int();
            return expr.inferredType;
          }
          case "~": {
            if (!Types.isIntegral(t)) {
              throw semaError(`Operator '~' requires integral operand, got ${t}`, expr);
            }
            expr.inferredType = this.tf.int();
            return expr.inferredType;
          }
          case "&": {
            if (!this._isLValue(expr.expr)) {
              throw semaError(`Operator '&' requires an lvalue`, expr);
            }
            expr.inferredType = this.tf.ptr(t);
            return expr.inferredType;
          }
          case "*": {
            if (!Types.isPointer(t)) {
              throw semaError(`Operator '*' requires pointer operand, got ${t}`, expr);
            }
            expr.inferredType = t.base;
            return expr.inferredType;
          }
          case "++":
          case "--": {
            // Pre-increment/decrement
            if (!this._isAssignableLValue(expr.expr)) {
              throw semaError(`Pre-increment/decrement requires assignable lvalue`, expr);
            }
            if (!Types.isNumeric(t)) {
              throw semaError(`Increment/decrement requires numeric operand, got ${t}`, expr);
            }
            expr.inferredType = t;
            return expr.inferredType;
          }
          default:
            throw semaError(`Unknown unary operator '${expr.op}'`, expr);
        }
      }

      case "PostfixExpr": {
        // Post-increment/decrement: x++, x--
        const t = this._checkExpr(expr.expr, scope);
        if (!this._isAssignableLValue(expr.expr)) {
          throw semaError(`Post-increment/decrement requires assignable lvalue`, expr);
        }
        if (!Types.isNumeric(t)) {
          throw semaError(`Increment/decrement requires numeric operand, got ${t}`, expr);
        }
        expr.inferredType = t;
        return expr.inferredType;
      }

      case "BinaryExpr": {
        const lt = this._checkExpr(expr.left, scope);
        const rt = this._checkExpr(expr.right, scope);

        const op = expr.op;

        // Logical ops
        if (op === "&&" || op === "||") {
          if ((!Types.isNumeric(lt) && !Types.isPointer(lt)) || (!Types.isNumeric(rt) && !Types.isPointer(rt))) {
            throw semaError(`Operator '${op}' requires numeric/pointer operands`, expr);
          }
          expr.inferredType = this.tf.int();
          return expr.inferredType;
        }

        // Comparisons
        if (op === "==" || op === "!=" || op === "<" || op === "<=" || op === ">" || op === ">=") {
          // numeric-numeric ok; pointer-pointer ok if sameType; pointer-null not implemented in v1
          if (Types.isNumeric(lt) && Types.isNumeric(rt)) {
            expr.inferredType = this.tf.int();
            return expr.inferredType;
          }
          if (Types.isPointer(lt) && Types.isPointer(rt)) {
            if (!Types.sameType(lt, rt)) {
              throw semaError(`Pointer comparison requires matching pointer types, got ${lt} and ${rt}`, expr);
            }
            expr.inferredType = this.tf.int();
            return expr.inferredType;
          }
          throw semaError(`Operator '${op}' not supported for operand types ${lt} and ${rt}`, expr);
        }

        // Shifts: integral only
        if (op === "<<" || op === ">>") {
          if (!Types.isIntegral(lt) || !Types.isIntegral(rt)) {
            throw semaError(`Operator '${op}' requires integral operands`, expr);
          }
          expr.inferredType = this.tf.int();
          return expr.inferredType;
        }

        // Bitwise ops: integral only
        if (op === "&" || op === "|" || op === "^") {
          if (!Types.isIntegral(lt) || !Types.isIntegral(rt)) {
            throw semaError(`Operator '${op}' requires integral operands`, expr);
          }
          expr.inferredType = this.tf.int();
          return expr.inferredType;
        }

        // Arithmetic: numeric only
        if (op === "+" || op === "-" || op === "*" || op === "/" || op === "%") {
          if (!Types.isNumeric(lt) || !Types.isNumeric(rt)) {
            throw semaError(`Operator '${op}' requires numeric operands, got ${lt} and ${rt}`, expr);
          }
          if (op === "%" && (!Types.isIntegral(lt) || !Types.isIntegral(rt))) {
            throw semaError(`Operator '%' requires integral operands`, expr);
          }
          const conv = Types.usualArithmeticConversion(lt, rt, this.tf);
          expr.inferredType = conv.result;
          return expr.inferredType;
        }

        throw semaError(`Unknown binary operator '${op}'`, expr);
      }

      case "AssignExpr": {
        const lt = this._checkExpr(expr.target, scope);
        const rt = this._checkExpr(expr.value, scope);

        if (!this._isAssignableLValue(expr.target)) {
          throw semaError(`Left-hand side of assignment must be assignable`, expr.target);
        }

        if (!Types.isAssignable(lt, rt, this.tf)) {
          throw semaError(`Cannot assign value of type ${rt} to target of type ${lt}`, expr);
        }

        expr.inferredType = lt;
        return expr.inferredType;
      }

      case "CompoundAssignExpr": {
        const lt = this._checkExpr(expr.target, scope);
        const rt = this._checkExpr(expr.value, scope);

        if (!this._isAssignableLValue(expr.target)) {
          throw semaError(`Left-hand side of compound assignment must be assignable`, expr.target);
        }

        // For compound assignment, the right side must be compatible with the left side
        // and the operation must be valid
        const op = expr.op.slice(0, -1); // Remove '=' to get the operator
        if (op === "+" || op === "-" || op === "*" || op === "/" || op === "%") {
          if (!Types.isNumeric(lt) || !Types.isNumeric(rt)) {
            throw semaError(`Compound assignment '${expr.op}' requires numeric operands`, expr);
          }
        } else if (op === "&" || op === "|" || op === "^" || op === "<<" || op === ">>") {
          if (!Types.isIntegral(lt) || !Types.isIntegral(rt)) {
            throw semaError(`Compound assignment '${expr.op}' requires integral operands`, expr);
          }
        }

        expr.inferredType = lt;
        return expr.inferredType;
      }

              case "CallExpr": {
        // Initial subset: callee must be identifier bound to function symbol
        if (expr.callee.kind !== "IdentifierExpr") {
          throw semaError(
            `Only direct function calls are supported (callee must be identifier)`,
            expr.callee
          );
        }

        const calleeSym = this.globalScope.lookup(expr.callee.name);
        if (!calleeSym || calleeSym.kind !== "func") {
          throw semaError(`'${expr.callee.name}' is not a function`, expr.callee);
        }
        expr.callee.symbol = calleeSym;

        const ftype = calleeSym.type;
        if (!ftype || ftype.kind !== "func") {
          throw semaError(
            `Internal: function '${calleeSym.name}' has invalid type`,
            expr.callee
          );
        }

        // Special-case: builtin print(any) with exactly 1 argument
        if (calleeSym.isBuiltin && calleeSym.name === "print") {
          if (expr.args.length !== 1) {
            throw semaError(
              `Function 'print' expects 1 argument, got ${expr.args.length}`,
              expr
            );
          }
          this._checkExpr(expr.args[0], scope); // accept any type
          expr.inferredType = this.tf.void();
          return expr.inferredType;
        }

        // Variadic builtins (printf, scanf, sprintf, etc.) — accept any arg count
        if (calleeSym.isBuiltin && calleeSym.builtinOptions && calleeSym.builtinOptions.anyArgs) {
          for (const arg of expr.args) this._checkExpr(arg, scope);
          expr.inferredType = ftype.ret;
          return expr.inferredType;
        }

        if (expr.args.length !== ftype.params.length) {
          throw semaError(
            `Function '${calleeSym.name}' expects ${ftype.params.length} argument(s), got ${expr.args.length}`,
            expr
          );
        }

        for (let i = 0; i < expr.args.length; i++) {
          let at = this._checkExpr(expr.args[i], scope);
          const pt = ftype.params[i];
          
          // Array-to-pointer decay: int[8] -> int*
          if (Types.isArray(at) && Types.isPointer(pt)) {
            const arrayBase = at.base;
            const ptrBase = pt.base;
            if (Types.sameType(arrayBase, ptrBase)) {
              at = pt; // Decay array to pointer
            }
          }
          
          // Allow any pointer to void* conversion
          if (Types.isPointer(pt) && Types.isVoid(pt.base) && Types.isPointer(at)) {
            // void* parameter accepts any pointer
          } else if (!Types.isAssignable(pt, at, this.tf)) {
            throw semaError(
              `Argument ${i + 1} of '${calleeSym.name}' expects ${pt}, got ${at}`,
              expr.args[i]
            );
          }
        }

        expr.inferredType = ftype.ret;
        return expr.inferredType;
      }



      case "MemberExpr": {
        // object.field or object->field
        const objT = this._checkExpr(expr.object, scope);

        let structT = null;

        if (expr.isArrow) {
          if (!Types.isPointer(objT) || !Types.isStruct(objT.base)) {
            throw semaError(`'->' requires pointer-to-struct on left, got ${objT}`, expr);
          }
          structT = objT.base;
        } else {
          if (!Types.isStruct(objT)) {
            throw semaError(`'.' requires struct on left, got ${objT}`, expr);
          }
          structT = objT;
        }

        if (!structT.isResolved()) {
          throw semaError(`Struct type '${structT}' is not fully defined`, expr);
        }

        const field = structT.getField(expr.field);
        if (!field) {
          throw semaError(`Struct '${structT}' has no field named '${expr.field}'`, expr);
        }

        expr.fieldIndex = field.index;
        expr.structType = structT;
        expr.inferredType = field.type;
        return expr.inferredType;
      }

      case "IndexExpr": {
        // array[index] - for now support:
        // - pointer base: T* and returns T
        // - array type: T[N] and returns T
        const arrT = this._checkExpr(expr.array, scope);
        const idxT = this._checkExpr(expr.index, scope);
        if (!Types.isIntegral(idxT)) {
          throw semaError(`Array index must be integral, got ${idxT}`, expr.index);
        }

        if (Types.isPointer(arrT)) {
          expr.inferredType = arrT.base;
          return expr.inferredType;
        }
        if (Types.isArray(arrT)) {
          expr.inferredType = arrT.base;
          return expr.inferredType;
        }

        throw semaError(`Indexing requires pointer or array on left, got ${arrT}`, expr);
      }

      case "CastExpr": {
        const toT = this._resolveTypeNode(expr.typeNode);
        const fromT = this._checkExpr(expr.expr, scope);

        // Cast rules: numeric<->numeric, pointer conversions
        if (Types.isNumeric(toT) && Types.isNumeric(fromT)) {
          expr.inferredType = toT;
          return expr.inferredType;
        }
        if (Types.isPointer(toT) && Types.isPointer(fromT)) {
          // Allow void* to any pointer, and any pointer to void*
          const toBase = toT.base;
          const fromBase = fromT.base;
          if (Types.isVoid(toBase) || Types.isVoid(fromBase)) {
            expr.inferredType = toT;
            return expr.inferredType;
          }
          // Same pointer types
          if (Types.sameType(toT, fromT)) {
            expr.inferredType = toT;
            return expr.inferredType;
          }
          // For CP grade, allow some pointer casts (strict checking can be added later)
          expr.inferredType = toT;
          return expr.inferredType;
        }

        throw semaError(`Unsupported cast from ${fromT} to ${toT}`, expr);
      }

      case "SizeofExpr": {
        // sizeof(type) or sizeof(expr)
        if (expr.isType) {
          const t = this._resolveTypeNode(expr.arg);
          // We don't compute byte sizes; in VM-world, just return 1 for scalar, fields count for struct, etc.
          // For now, return int constant type (value computed in irgen or constant-fold here if you want).
          expr._sizeofType = t;
        } else {
          const t = this._checkExpr(expr.arg, scope);
          expr._sizeofType = t;
        }
        expr.inferredType = this.tf.int();
        return expr.inferredType;
      }

      case "TernaryExpr": {
        const condT = this._checkExpr(expr.condition, scope);
        if (!Types.isNumeric(condT) && !Types.isPointer(condT)) {
          throw semaError(`Ternary condition must be numeric or pointer, got ${condT}`, expr.condition);
        }
        const thenT = this._checkExpr(expr.thenExpr, scope);
        const elseT = this._checkExpr(expr.elseExpr, scope);
        // Result type is the common type of then and else
        if (Types.sameType(thenT, elseT)) {
          expr.inferredType = thenT;
        } else if (Types.isNumeric(thenT) && Types.isNumeric(elseT)) {
          const conv = Types.usualArithmeticConversion(thenT, elseT, this.tf);
          expr.inferredType = conv.result;
        } else {
          throw semaError(`Ternary branches have incompatible types: ${thenT} and ${elseT}`, expr);
        }
        return expr.inferredType;
      }

      case "CommaExpr": {
        // Evaluate left side (for side effects), then right side
        this._checkExpr(expr.left, scope);
        const rt = this._checkExpr(expr.right, scope);
        expr.inferredType = rt;
        return expr.inferredType;
      }

      case "InitializerList": {
        // For arrays, check that elements match array element type
        // For now, just check all elements are compatible
        if (expr.elements.length === 0) {
          expr.inferredType = this.tf.int(); // default
          return expr.inferredType;
        }
        const firstT = this._checkExpr(expr.elements[0], scope);
        for (let i = 1; i < expr.elements.length; i++) {
          const elemT = this._checkExpr(expr.elements[i], scope);
          if (!Types.isAssignable(firstT, elemT, this.tf)) {
            throw semaError(`Initializer list element ${i} type ${elemT} not compatible with ${firstT}`, expr.elements[i]);
          }
        }
        expr.inferredType = firstT;
        return expr.inferredType;
      }

      default:
        throw semaError(`Unknown expression kind '${expr.kind}'`, expr);
    }
  }

  // --------------------------
  // Lvalue / assignability
  // --------------------------
  _isLValue(e) {
    // lvalue: identifier var, deref (*p), member access, index
    switch (e.kind) {
      case "IdentifierExpr": {
        // must resolve to a variable
        const sym = e.symbol;
        return !!sym && sym.kind === "var";
      }
      case "UnaryExpr":
        return e.op === "*" && true;
      case "MemberExpr":
        return true;
      case "IndexExpr":
        return true;
      default:
        return false;
    }
  }

  _isAssignableLValue(e) {
    // In v1: same as lvalue, but disallow assignment to function identifiers
    return this._isLValue(e);
  }

  // --------------------------
  // Constant int evaluator (limited)
  // Used for array sizes, etc.
  // --------------------------
  _evalConstInt(expr) {
    try {
      switch (expr.kind) {
        case "IntLiteralExpr":
          return parseInt(expr.value, 10);
        case "CharLiteralExpr": {
          // very small: only plain 'a' or escaped like '\n'
          const v = this._decodeChar(expr.value);
          return v;
        }
        case "UnaryExpr": {
          const v = this._evalConstInt(expr.expr);
          if (v == null) return null;
          if (expr.op === "-") return -v;
          if (expr.op === "~") return ~v;
          if (expr.op === "!") return v ? 0 : 1;
          return null;
        }
        case "BinaryExpr": {
          const a = this._evalConstInt(expr.left);
          const b = this._evalConstInt(expr.right);
          if (a == null || b == null) return null;
          switch (expr.op) {
            case "+": return a + b;
            case "-": return a - b;
            case "*": return a * b;
            case "/": return b === 0 ? null : Math.trunc(a / b);
            case "%": return b === 0 ? null : (a % b);
            case "<<": return a << b;
            case ">>": return a >> b;
            case "&": return a & b;
            case "|": return a | b;
            case "^": return a ^ b;
            default: return null;
          }
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  _decodeChar(raw) {
    // raw is either "a" or "\\n" style (without surrounding quotes)
    if (raw.length === 1) return raw.charCodeAt(0);
    if (raw[0] !== "\\") return raw.charCodeAt(0);
    const c = raw[1];
    switch (c) {
      case "n": return 10;
      case "r": return 13;
      case "t": return 9;
      case "0": return 0;
      case "\\": return 92;
      case "'": return 39;
      case '"': return 34;
      default:
        // fallback: return literal char
        return c.charCodeAt(0);
    }
  }
}

// ------------------------------
// Public API
// ------------------------------
function analyze(program) {
  const sema = new SemanticAnalyzer();
  return sema.analyze(program);
}

module.exports = {
  analyze,

  // Exported for debugging/introspection if needed
  SemanticAnalyzer,
  Scope,
  VarSymbol,
  FuncSymbol,
  StructSymbol,
};
