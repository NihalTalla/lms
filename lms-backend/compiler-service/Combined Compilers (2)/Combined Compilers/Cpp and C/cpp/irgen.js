// cpp/irgen.js
// v0.7: Heap Allocation (new/delete) + pointers + ptr->field access
//
// Builds on v0.6:
// - primitive types + numeric promotion + comparisons + void returns
// - stack-only structs (POD) with value semantics via CLONE_STRUCT
// - classes with fields/methods, implicit this, CALL_METHOD/DEF_METHOD/ALLOC_OBJ
// - lists, indexing, print, control flow
//
// New in v0.7 (this file emits IR ops; VM/lower will be updated next):
// - pointer types: T*
// - null literal
// - new T() => ALLOC_OBJECT
// - delete p; => FREE_OBJECT
// - ptr->field => LOAD_PTR_FIELD
// - ptr->field = v => STORE_PTR_FIELD
// - ptr->method(args) => LOAD_PTR + CALL_METHOD

const { IRProgram } = require("../ir/ir");
const AST = require("./ast");
const { CompileError } = require("./errors");

// ----------------------------
// AST compatibility aliases (v0.7 ↔ v0.8)
// Prevents "Right-hand side of 'instanceof' is not an object" when node class names differ.
// This does NOT change semantics; it only maps alternate exported names onto the ones used below.
// ----------------------------
(function aliasASTNames(AST) {
  function alias(name, ...alts) {
    if (AST[name]) return;
    for (const a of alts) {
      if (AST[a]) { AST[name] = AST[a]; return; }
    }
  }

  // Top-level / decls
  alias("Program", "Prog");
  alias("StructDecl", "StructDef");
  alias("ClassDecl", "ClassDef", "ClassDeclaration");
  alias("MethodDecl", "MethodDef");
  alias("FunctionDecl", "FuncDecl", "FunctionDef");
  alias("VarDecl", "LetDecl");

  // Statements
  alias("AssignStmt", "Assign");
  alias("AssignFieldStmt", "FieldAssign");
  alias("AssignPtrFieldStmt", "PtrFieldAssign");
  alias("PrintStmt", "Print");
  alias("IfStmt", "If");
  alias("WhileStmt", "While");
  alias("ReturnStmt", "Return");
  alias("ExprStmt", "ExprStatement");
  alias("DeleteStmt", "FreeStmt", "DelStmt");
  alias("ThrowStmt");
  alias("TryCatchStmt");

  // Expressions / literals
  alias("IntLiteral", "IntLit", "IntExpr");
  alias("FloatLiteral", "FloatLit", "FloatExpr");
  alias("BoolLiteral", "BoolLit", "BoolExpr");
  alias("StringLiteral", "StringLit", "StrLit", "StrExpr");
  alias("NullLiteral", "NullLit");

  alias("VarExpr", "VarRef");
  alias("ThisExpr", "This");
  alias("BinaryExpr", "BinExpr");
  alias("UnaryExpr", "UnExpr");
  alias("CallExpr", "Call");
  alias("MethodCallExpr", "CallMethodExpr");
  alias("PtrMethodCallExpr", "CallPtrMethodExpr");
  alias("FieldAccessExpr", "GetFieldExpr");
  alias("PtrFieldAccessExpr", "GetPtrFieldExpr");
  alias("ListLiteral", "ListLit");
  alias("IndexExpr", "Index");
  alias("NewExpr", "New");
})(AST);

function generateIR(program) {
  // VM-level builtins (resolved at runtime when CALL addr is undefined)
  const BUILTINS = new Set(["len", "input"]);
  const ir = new IRProgram();

  // ----------------------------
  // Error helpers
  // ----------------------------
  function locOf(node) {
    return node && node.loc ? node.loc : null;
  }
  function cerror(message, loc = null) {
    throw new CompileError(message, loc || null);
  }

  // ----------------------------
  // Temp locals for IR generation (used for virtual dispatch, etc.)
  // ----------------------------
  let __tmpCounter = 0;
  function freshTemp(prefix = "__tmp") {
    return `${prefix}_${__tmpCounter++}`;
  }

  // ----------------------------
  // Collect declarations
  // ----------------------------
  const funcs = program.funcs || [];
  // NOTE: stdlib/prelude often contains function *declarations* without bodies.
  // We keep their signatures in the AST, but only generate IR for definitions.
  const funcsWithBody = funcs.filter((f) => f.body !== null);

  const mainFunc = funcsWithBody.find((f) => f.name === "main");
  if (!mainFunc) cerror("No main() function found", null);
  const otherFuncs = funcsWithBody.filter((f) => f.name !== "main");

  // ---- Hoist local class declarations out of function bodies ----
  function hoistLocalClassesFromBody(body, outClasses) {
    const newBody = [];
    for (const st of body) {
      if (st instanceof AST.ClassDecl) outClasses.push(st);
      else newBody.push(st);
    }
    return newBody;
  }

  const hoisted = [];
  for (const fn of funcsWithBody) {
    if (fn.body) fn.body = hoistLocalClassesFromBody(fn.body, hoisted);
  }

  // IMPORTANT: update program.classes first, then read classes
  program.classes = (program.classes || []).concat(hoisted);

  const structs = program.structs || [];
  const classes = program.classes || []; // <-- AFTER hoisting

  // Build name sets AFTER hoisting so typeFromName can resolve local classes too
  const knownStructNames = new Set(structs.map((s) => s.name));
  const knownClassNames = new Set(classes.map((c) => c.name));

  // ----------------------------
  // Types
  // ----------------------------
  function typeFromName(typeName) {
    if (typeName === "int") return { kind: "int" };
    // normalize common C/C++ integral aliases used in stdlib stubs
    if (typeName === "long" || typeName === "long long" || typeName === "short") return { kind: "int" };
    if (typeof typeName === "string" && (typeName.startsWith("unsigned") || typeName.startsWith("signed"))) {
      return { kind: "int" };
    }
    if (typeName === "float") return { kind: "float" };
    if (typeName === "double" || typeName === "long double") return { kind: "float" };
    if (typeName === "bool") return { kind: "bool" };
    if (typeName === "void") return { kind: "void" };
    if (typeName === "string") return { kind: "string" };
    if (typeName === "list") return { kind: "list" };

    if (typeof typeName === "string") {
      let s = typeName.trim();

      // optional const prefix (compile-time only; no runtime change)
      let isConst = false;
      if (s.startsWith("const ")) {
        isConst = true;
        s = s.slice("const ".length).trim();
      }

      
      // function pointer pseudo-type: fnptr<ret>(p1,p2,...)
      // Used to model C-style function pointer declarators minimally.
      if (s.startsWith("fnptr<")) {
        const m = s.match(/^fnptr<([^>]+)>\((.*)\)$/);
        if (m) {
          const retName = m[1].trim();
          const argsStr = m[2].trim();
          const retT = typeFromName(retName);
          const paramNames = argsStr.length ? argsStr.split(",").map(x=>x.trim()).filter(Boolean) : [];
          const paramsT = paramNames.map(n => typeFromName(n));
          const t = { kind: "fnptr", ret: retT, params: paramsT };
          if (isConst) t.isConst = true;
          return t;
        }
      }

// reference suffix: &
      // v0.9 rule: references are lowered to pointers at runtime. Treating
      // them as pointers everywhere avoids special-case restrictions (e.g.
      // method return types) while preserving existing semantics.
      if (s.endsWith("&")) {
        const baseName = s.slice(0, -1).trim();
        const base = typeFromName(baseName);
        if (base.kind === "unknown" || base.kind === "void") {
          return { kind: "unknown", name: typeName };
        }
        const t = { kind: "ptr", to: base, isRef: true };
        if (isConst) t.isConst = true;
        return t;
      }

      // pointer suffix: *
      if (s.endsWith("*")) {
        const baseName = s.slice(0, -1).trim();
        const base = typeFromName(baseName);
        if (base.kind === "unknown" || base.kind === "void") {
          return { kind: "unknown", name: typeName };
        }
        const t = { kind: "ptr", to: base };
        if (isConst) t.isConst = true;
        return t;
      }

      // Template type spellings like `vector<int>` / `std::vector<int>` appear
      // frequently in stdlib stubs. We treat the base name as the declared class/struct.
      const baseNoArgs = s.includes("<") ? s.slice(0, s.indexOf("<")).trim() : null;

      const baseStd = baseNoArgs ? `std::${baseNoArgs}` : null;

      if (
        knownStructNames.has(s) ||
        (baseNoArgs && knownStructNames.has(baseNoArgs)) ||
        (baseStd && knownStructNames.has(baseStd))
      ) {
        // If this is a template spelling (e.g. `pair<int,int>`), bind to the
        // declared runtime struct name (base) rather than the full instantiation.
        const boundName =
          (baseNoArgs && knownStructNames.has(baseNoArgs)) ? baseNoArgs :
          (baseStd && knownStructNames.has(baseStd)) ? baseStd :
          s;
        const t = { kind: "struct", name: boundName };
        if (isConst) t.isConst = true;
        return t;
      }
      if (
        knownClassNames.has(s) ||
        (baseNoArgs && knownClassNames.has(baseNoArgs)) ||
        (baseStd && knownClassNames.has(baseStd))
      ) {
        const boundName =
          (baseNoArgs && knownClassNames.has(baseNoArgs)) ? baseNoArgs :
          (baseStd && knownClassNames.has(baseStd)) ? baseStd :
          s;
        const t = { kind: "class", name: boundName };
        if (isConst) t.isConst = true;
        return t;
      }

      // const on primitives
      if (isConst) {
        const base = typeFromName(s);
        if (base.kind !== "unknown") {
          base.isConst = true;
          return base;
        }
      }
    }

    return { kind: "unknown", name: typeName };
  }

  // v0.9 exceptions: compile a catch type descriptor for the VM
  // catchTypeDesc is an object consumed by vm.handlerMatches().
  function compileCatchType(t) {
    if (!t) return null;

    // Allow catching any exception by using "catch (int ... )" etc only;
    // we do not implement "catch(...)" syntax.
    if (t.kind === "int" || t.kind === "float" || t.kind === "bool" || t.kind === "string" || t.kind === "list") {
      return { kind: "prim", name: t.kind };
    }

    // References are lowered to pointers, but catch types are declared as non-ref.
    if (t.kind === "ref") {
      // treat as pointer to underlying
      if (!t.to) {
        return { kind: "unknown", name: null };
      }
      t = { kind: "ptr", to: t.to };
    }

    if (t.kind === "ptr") {
      if (t.to && t.to.kind === "class") return { kind: "classptr", name: t.to.name };
      if (t.to && t.to.kind === "struct") return { kind: "structptr", name: t.to.name };
      return { kind: "ptr", name: null }; // any pointer
    }

    // Catching non-pointer user types by value is not supported in this version.
    return { kind: "unknown", name: null };
  }

  function sameType(a, b) {
    if (!a || !b) return false;
    if (a.kind !== b.kind) return false;
    if ((a.isConst || false) !== (b.isConst || false)) return false;
    if (a.kind === "struct" || a.kind === "class") return a.name === b.name;
    if (a.kind === "ptr" || a.kind === "ref") return sameType(a.to, b.to);
    if (a.kind === "fnptr") {
      if (!sameType(a.ret, b.ret)) return false;
      const ap = a.params || [];
      const bp = b.params || [];
      if (ap.length !== bp.length) return false;
      for (let i = 0; i < ap.length; i++) {
        if (!sameType(ap[i], bp[i])) return false;
      }
      return true;
    }
    return true;
  }

  function isNumeric(t) {
    return t && (t.kind === "int" || t.kind === "float");
  }

  function promoteNumericType(t1, t2) {
    if (!isNumeric(t1) || !isNumeric(t2)) return null;
    if (t1.kind === "float" || t2.kind === "float") return { kind: "float" };
    return { kind: "int" };
  }

  function isNullType(t) {
    return t && t.kind === "null";
  }

  function isPtrType(t) {
    return t && t.kind === "ptr";
  }

  function isRefType(t) {
    return t && t.kind === "ref";
  }

  function mustGetStructLayout(structName, loc = null) {
    const L = structLayouts.get(structName);
    if (!L) cerror(`Unknown struct type '${structName}'`, loc);
    return L;
  }

  function mustGetClassLayout(className, loc = null) {
    const L = classLayouts.get(className);
    if (!L) cerror(`Unknown class type '${className}'`, loc);
    return L;
  }

  function mangleMethodName(className, methodName) {
    return `__${className}_${methodName}`;
  }

  function mangleDtorName(className) {
    return `__${className}__dtor`;
  }

  // ----------------------------
  // Struct layouts (compile-time)
  // name -> { n, fieldIndex, fieldTypes, fieldReadonly }
  // ----------------------------
  const structLayouts = new Map();
  for (const sd of structs) {
    const fieldIndex = new Map();
    const fieldTypes = [];
    (sd.fields || []).forEach((f, i) => {
      fieldIndex.set(f.name, i);
      fieldTypes[i] = f.typeName;
    });
    structLayouts.set(sd.name, { n: (sd.fields || []).length, fieldIndex, fieldTypes });
  }

  // ----------------------------
  // Class layouts (compile-time)
  // name -> { n, fieldIndex, fieldTypes, methods }
  // methods: Map(methodName -> { retType: Type, params: Type[], funcName: string })
  // ----------------------------
  const classLayouts = new Map();

  // Build class layout with single inheritance (base fields first).
  function buildClassLayout(cd) {
    if (classLayouts.has(cd.name)) return classLayouts.get(cd.name);

    const baseName = cd.baseName || null;
    let inheritedIndex = new Map();
    let inheritedTypes = [];
    let inheritedReadonly = [];
    let baseN = 0;

    if (baseName) {
      const baseDecl = classes.find((c) => c.name === baseName);
      if (!baseDecl) cerror(`Unknown base class '${baseName}'`, locOf(cd));
      const baseLayout = buildClassLayout(baseDecl);
      inheritedIndex = new Map(baseLayout.fieldIndex);
      inheritedTypes = (baseLayout.fieldTypes || []).slice();
      inheritedReadonly = (baseLayout.fieldReadonly || Array(baseLayout.n || 0).fill(false)).slice();
      baseN = baseLayout.n;
    }

    const fieldIndex = inheritedIndex;
    const fieldTypes = inheritedTypes;
    const fieldReadonly = inheritedReadonly.slice();

    (cd.fields || []).forEach((f, i) => {
      if (fieldIndex.has(f.name)) {
        cerror(`Duplicate field '${f.name}' in class '${cd.name}'`, f.loc || locOf(cd));
      }
      const off = baseN + i;
      fieldIndex.set(f.name, off);
      fieldTypes[off] = f.typeName;
      fieldReadonly[off] = !!(f.isReadonly || f.readonly);
    });

    const methods = new Map();
    for (const m of cd.methods || []) {
      // Skip stream operators - they're handled specially as binary operators
      if ((m.name === "operator<<" && (cd.name === "ostream" || cd.name === "std::ostream")) ||
          (m.name === "operator>>" && (cd.name === "istream" || cd.name === "std::istream"))) {
        continue;
      }
      // Keep methods in layout even if no body (for type checking), but mark them
      const retType = typeFromName(m.returnType || "void");
      if (retType.kind === 'ref') cerror(`Methods cannot return references yet`, locOf(m));
      const params = (m.params || []).map((p) => typeFromName(p.typeName));
      const funcName = m.body !== null ? mangleMethodName(cd.name, m.name) : null; // null if no body
      const entry = { retType, params, funcName, isConst: !!m.isConst, hasBody: m.body !== null };
      if (methods.has(m.name)) {
        const prev = methods.get(m.name);
        // Prefer non-const overload when we can't do full overload resolution.
        if (prev && prev.isConst && !entry.isConst) {
          methods.set(m.name, entry);
        }
      } else {
        methods.set(m.name, entry);
      }
    }

    const layout = {
      baseName,
      n: baseN + (cd.fields || []).length,
      fieldIndex,
      fieldTypes,
      fieldReadonly,
      methods,
      };
    classLayouts.set(cd.name, layout);
    return layout;
  }

  for (const cd of classes) buildClassLayout(cd);

  // ----------------------------
  
  // --- v0.8: pointer assignability for single inheritance (upcasts) ---
  function isSubclassOf(childName, baseName) {
    if (childName === baseName) return true;
    let cur = classLayouts.get(childName);
    const seen = new Set();
    while (cur && cur.baseName) {
      if (seen.has(cur.name)) break; // defensive cycle break
      seen.add(cur.name);
      if (cur.baseName === baseName) return true;
      cur = classLayouts.get(cur.baseName);
    }
    return false;
  }

  function isAssignablePtr(dstPtrType, srcType) {
    // dstPtrType.kind === "ptr"
    if (!dstPtrType || dstPtrType.kind !== "ptr") return false;
    if (srcType && srcType.kind === "null") return true;
    if (!srcType || srcType.kind !== "ptr") return false;
    if (sameType(dstPtrType, srcType)) return true;

    // allow upcast: (Derived*) -> (Base*) when both point to classes
    const dstTo = dstPtrType.to;
    const srcTo = srcType.to;
    if (
      dstTo &&
      srcTo &&
      dstTo.kind === "class" &&
      srcTo.kind === "class" &&
      typeof dstTo.name === "string" &&
      typeof srcTo.name === "string"
    ) {
      return isSubclassOf(srcTo.name, dstTo.name);
    }

    return false;
  }

// v0.8: VTable layouts (name -> { slots: string[], slotIndex: Map(name->idx) })
  // Slots are keyed by method name (no overloading in this language).
  // ----------------------------
  const vtableLayouts = new Map();

  function buildVTableLayout(className) {
    if (vtableLayouts.has(className)) return vtableLayouts.get(className);
    const cd = classes.find((c) => c.name === className);
    if (!cd) cerror(`Unknown class '${className}'`, null);

    const baseName = cd.baseName || null;
    let slotNames = [];
    let slotFuncs = [];

    if (baseName) {
      const baseVT = buildVTableLayout(baseName);
      slotNames = baseVT.slotNames.slice();
      slotFuncs = baseVT.slots.slice();
    }

    for (const m of cd.methods || []) {
      // Skip stream operators - they're handled specially as binary operators
      if ((m.name === "operator<<" && (cd.name === "ostream" || cd.name === "std::ostream")) ||
          (m.name === "operator>>" && (cd.name === "istream" || cd.name === "std::istream"))) {
        continue;
      }
      // Skip methods that are only declared (no body) - they're handled by runtime or not implemented
      if (m.body === null) {
        continue;
      }
      const idx = slotNames.indexOf(m.name);
      const fn = mangleMethodName(cd.name, m.name);
      if (idx >= 0) slotFuncs[idx] = fn; // override
      else {
        slotNames.push(m.name);
        slotFuncs.push(fn);
      }
    }

    const slotIndex = new Map();
    slotNames.forEach((n, i) => slotIndex.set(n, i));

    const vt = { className, baseName, slots: slotFuncs, slotNames, slotIndex };
    vtableLayouts.set(className, vt);
    return vt;
  }

  for (const cd of classes) buildVTableLayout(cd.name);

  // Emit DEF_VTABLE meta instructions early. Lowering will resolve slot function names to addresses.
  for (const [cn, vt] of vtableLayouts.entries()) {
    const cd = classes.find((c) => c.name === cn);
    const dtorDecls = (cd && cd.destructors) ? cd.destructors : [];
    if (dtorDecls.length > 1) cerror(`Class '${cn}' has multiple destructors`, cd.loc || null);
    // Skip destructors that have no body (template classes)
    const dtorFuncName = (dtorDecls.length === 1 && dtorDecls[0].body !== null) ? mangleDtorName(cn) : null;
    ir.emit("DEF_VTABLE", {
      className: cn,
      baseName: vt.baseName,
      slots: vt.slots,
      dtorFuncName,
    });
  }

  // Function signatures (free functions + mangled methods)
  // ----------------------------
  const funcSigs = new Map();

  // free functions
  for (const f of funcs) {
    const retType = typeFromName(f.returnType || "int");
    if (retType.kind === 'ref') cerror(`Functions cannot return references yet`, locOf(f));
    const params = (f.params || []).map((p) => typeFromName(p.typeName));
    funcSigs.set(f.name, { retType, params });
  }

  // methods as functions (mangled)
  for (const cd of classes) {
    for (const m of cd.methods || []) {
      // Skip stream operators - they're handled specially as binary operators
      if ((m.name === "operator<<" && (cd.name === "ostream" || cd.name === "std::ostream")) ||
          (m.name === "operator>>" && (cd.name === "istream" || cd.name === "std::istream"))) {
        continue;
      }
      const mangled = mangleMethodName(cd.name, m.name);
      const retType = typeFromName(m.returnType || "void");
      if (retType.kind === 'ref') cerror(`Methods cannot return references yet`, locOf(m));
      const params = [{ kind: "class", name: cd.name }, ...(m.params || []).map((p) => typeFromName(p.typeName))];
      funcSigs.set(mangled, { retType, params });
    }
  }

  // destructors as functions (mangled)
  for (const cd of classes) {
    const dtorDecls = cd.destructors || [];
    if (dtorDecls.length > 1) cerror(`Class '${cd.name}' has multiple destructors`, cd.loc);
    if (dtorDecls.length !== 1) continue;
    // Skip destructors that have no body (template classes)
    if (dtorDecls[0].body === null) continue;
    const mangled = mangleDtorName(cd.name);
    const retType = { kind: 'void' };
    const params = [{ kind: 'class', name: cd.name }];
    funcSigs.set(mangled, { retType, params });
  }


  // ----------------------------
  // Per-function state
  // ----------------------------
  let inFunction = false;
  let currentFuncName = "main";
  let currentFuncRetType = { kind: "int" };

  // For method bodies
  let inMethod = false;
  let currentClassName = null; // when in method: class name of "this"
  let currentThisType = null;  // {kind:"class", name: ...}

  // name -> Type
  let varTypes = new Map();

  function getVarType(varName) {
    return varTypes.get(varName) || null;
  }

  function inferAggregateTypeFromBaseExpr(baseExpr) {
    // Field base can be:
    // - VarExpr of known struct/class type
    // - ThisExpr (inside a method)
    if (baseExpr instanceof AST.VarExpr) {
      const t = getVarType(baseExpr.name);
      if (t && (t.kind === "struct" || t.kind === "class")) return t;
    }
    if (baseExpr instanceof AST.ThisExpr) {
      if (!inMethod || !currentThisType) cerror("Use of 'this' outside a method", locOf(baseExpr));
      return currentThisType;
    }
    return null;
  }

  // ----------------------------
  // Expression type inference
  // ----------------------------
  function inferExprType(node) {
    if (!node) return { kind: "void" };

    if (node instanceof AST.IntLiteral) return { kind: "int" };
    if (node instanceof AST.FloatLiteral) return { kind: "float" };
    if (node instanceof AST.BoolLiteral) return { kind: "bool" };
    if (node instanceof AST.StringLiteral) return { kind: "string" };

    // v0.7: null
    if (node instanceof AST.NullLiteral) return { kind: "null" };

    // v0.7: new T()
    if (node instanceof AST.NewExpr) {
      const base = typeFromName(node.typeName);
      if (base.kind !== "struct" && base.kind !== "class") {
        cerror(`'new' expects a struct/class type, got '${node.typeName}'`, locOf(node));
      }
      return { kind: "ptr", to: base };
    }

    if (node instanceof AST.ThisExpr) {
      if (!inMethod || !currentThisType) cerror("Use of 'this' outside a method", locOf(node));
      return currentThisType;
    }

    if (node instanceof AST.VarExpr) {
      const t = getVarType(node.name);
      if (!t) {
        const base = node.name.split("::").pop();
        // Function name used as a value (decays to function pointer).
        // Needed for C-style function-pointer arguments (e.g., sort(..., cmp)).
        const fSig = funcSigs.get(node.name) || funcSigs.get(base);
        if (fSig) {
          return { kind: "fnptr", ret: fSig.retType, params: fSig.params };
        }
        if (base === "cout" || base === "cerr" || base === "cin") {
          // These are often declared as `extern` in headers; our frontend
          // doesn't model extern globals yet, but we can still compile
          // stream-expression chains because they get lowered to PRINT_INLINE.
          return { kind: "unknown" };
        }
        cerror(`Undefined variable '${node.name}'`, locOf(node));
      }
      // References behave like their underlying value type in most expression contexts.
      if (t.kind === 'ref') {
        if (!t.to) {
          cerror(`Reference type '${node.name}' has undefined target type`, locOf(node));
        }
        return t.to;
      }
      return t;
    }

    if (node instanceof AST.ListLiteral) {
      return { kind: "list" };
    }

    if (node instanceof AST.IndexExpr) {
      const lt = inferExprType(node.list);
      // In the C++ front end, template stubs (e.g., std::vector) may be represented
      // as an unknown/runtime container. We allow indexing and defer to runtime.
      return { kind: "unknown" };
    }

    if (node instanceof AST.FieldAccessExpr) {
      const baseT = inferAggregateTypeFromBaseExpr(node.base);
      if (!baseT) cerror("Field access on non-struct/class", locOf(node));

      if (baseT.kind === "struct") {
        const layout = mustGetStructLayout(baseT.name, locOf(node));
        const off = layout.fieldIndex.get(node.field);
        if (off === undefined) cerror(`Struct '${baseT.name}' has no field '${node.field}'`, locOf(node));
        const fieldType = typeFromName(layout.fieldTypes[off]);
        if (!fieldType) cerror(`Cannot determine type for field '${node.field}' of struct '${baseT.name}'`, locOf(node));
        return fieldType;
      } else {
        const layout = mustGetClassLayout(baseT.name, locOf(node));
        const off = layout.fieldIndex.get(node.field);
        if (off === undefined) cerror(`Class '${baseT.name}' has no field '${node.field}'`, locOf(node));
        const fieldType = typeFromName(layout.fieldTypes[off]);
        if (!fieldType) cerror(`Cannot determine type for field '${node.field}' of class '${baseT.name}'`, locOf(node));
        return fieldType;
      }
    }

    // v0.7: ptr->field
    if (node instanceof AST.PtrFieldAccessExpr) {
      const pt = inferExprType(node.basePtr);
      if (!isPtrType(pt)) cerror("ptr->field on non-pointer", locOf(node));
      const base = pt.to;
      if (base.kind === "struct") {
        const layout = mustGetStructLayout(base.name, locOf(node));
        const off = layout.fieldIndex.get(node.field);
        if (off === undefined) cerror(`Struct '${base.name}' has no field '${node.field}'`, locOf(node));
        const fieldType = typeFromName(layout.fieldTypes[off]);
        if (!fieldType) cerror(`Cannot determine type for field '${node.field}' of struct '${base.name}'`, locOf(node));
        return fieldType;
      }
      if (base.kind === "class") {
        const layout = mustGetClassLayout(base.name, locOf(node));
        const off = layout.fieldIndex.get(node.field);
        if (off === undefined) cerror(`Class '${base.name}' has no field '${node.field}'`, locOf(node));
        const fieldType = typeFromName(layout.fieldTypes[off]);
        if (!fieldType) cerror(`Cannot determine type for field '${node.field}' of class '${base.name}'`, locOf(node));
        return fieldType;
      }
      cerror("ptr->field expects pointer to struct/class", locOf(node));
    }

    // v0.6: method call base.method(args)
    if (node instanceof AST.MethodCallExpr) {
      const baseT = inferExprType(node.base);
      // Class values are reference-semantics at runtime, but we still keep the
      // static type as `class`. In some places (especially with template stubs)
      // the base may appear as a pointer-to-class; accept that too.
      let classTy = baseT;
      if (baseT && baseT.kind === 'ptr' && baseT.to && baseT.to.kind === 'class') {
        classTy = baseT.to;
      }
      
// Built-in string methods (treated as intrinsics)
if (baseT && baseT.kind === "string") {
  if (node.methodName === "size" && (node.args || []).length === 0) return { kind: "int" };
  if (node.methodName === "length" && (node.args || []).length === 0) return { kind: "int" };
  if (node.methodName === "push_back" && (node.args || []).length === 1) return { kind: "void" };
  if (node.methodName === "c_str" && (node.args || []).length === 0) return { kind: "ptr", to: { kind: "char" } };
  cerror(`Unsupported string method '${node.methodName}'`, locOf(node));
  return { kind: "unknown" };
}

if (!classTy || classTy.kind !== "class") {
        const k = baseT ? baseT.kind : "<none>";
        cerror(`Method call on non-class (base kind: ${k})`, locOf(node));
      }
      const layout = mustGetClassLayout(classTy.name, locOf(node));
      const ms = layout.methods.get(node.methodName);
      if (!ms) cerror(`Class '${classTy.name}' has no method '${node.methodName}'`, locOf(node));

      if ((node.args || []).length !== ms.params.length) {
        cerror(
          `Method '${classTy.name}.${node.methodName}' expects ${ms.params.length} args, got ${(node.args || []).length}`,
          locOf(node)
        );
      }
      return ms.retType;
    }

    // v0.7: ptr->method(args)
    if (node instanceof AST.PtrMethodCallExpr) {
      const pt = inferExprType(node.basePtr);
      if (!isPtrType(pt)) cerror("ptr->method call on non-pointer", locOf(node));
      const base = pt.to;
      if (!base || base.kind !== "class") cerror("ptr->method requires pointer to class", locOf(node));

      const layout = mustGetClassLayout(base.name, locOf(node));
      const ms = layout.methods.get(node.methodName);
      if (!ms) cerror(`Class '${base.name}' has no method '${node.methodName}'`, locOf(node));

      if ((node.args || []).length !== ms.params.length) {
        cerror(
          `Method '${base.name}.${node.methodName}' expects ${ms.params.length} args, got ${(node.args || []).length}`,
          locOf(node)
        );
      }
      return ms.retType;
    }

    if (node instanceof AST.CastExpr) {
      return typeFromName(node.targetType, locOf(node));
    }

    if (node instanceof AST.IncExpr) {
      // ++x and x++ both yield the underlying numeric type.
      const t = inferExprType(node.expr);
      return t;
    }

    if (node instanceof AST.UnaryExpr) {
      const t = inferExprType(node.expr);
      if (node.op === "-") {
        if (!isNumeric(t)) cerror("Unary '-' expects numeric operand", locOf(node));
        return t;
      }
      if (node.op === "!") {
        if (t.kind !== "bool") cerror("Unary '!' expects bool operand", locOf(node));
        return { kind: "bool" };
      }

      if (node.op === "&") {
        // address-of yields pointer to the operand type.
        // Only well-defined for lvalues; enforced in codegen.
        return { kind: "ptr", to: t, isConst: false };
      }

      if (node.op === "*") {
        if (t.kind !== "ptr") cerror("Unary '*' expects pointer operand", locOf(node));
        if (!t.to) {
          cerror("Cannot dereference pointer with undefined target type", locOf(node));
        }
        return t.to;
      }
      cerror("Unsupported unary op: " + node.op, locOf(node));
    }

    if (node instanceof AST.BinaryExpr) {
      const lt = inferExprType(node.left);
      const rt = inferExprType(node.right);
      if (!lt || !rt) {
        cerror(`Cannot infer types for binary expression '${node.op}'`, locOf(node));
      }
      const op = node.op;

      // pointer arithmetic (C/C++-like):
      //   ptr + int  => ptr
      //   int + ptr  => ptr
      //   ptr - int  => ptr
      //   ptr - ptr  => int
      if (op === "+" || op === "-") {
        if (isPtrType(lt) && isNumeric(rt) && rt.kind === "int") return lt;
        if (op === "+" && isNumeric(lt) && lt.kind === "int" && isPtrType(rt)) return rt;
        if (op === "-" && isPtrType(lt) && isPtrType(rt)) return { kind: "int" };
      }

      if (["+", "-", "*"].includes(op)) {
        if (lt.kind === "unknown" || rt.kind === "unknown") return { kind: "unknown" };
        if (!isNumeric(lt) || !isNumeric(rt)) cerror(`Operator '${op}' expects numeric operands`, locOf(node));
        return promoteNumericType(lt, rt);
      }

      if (op === "/") {
        if (!isNumeric(lt) || !isNumeric(rt)) cerror(`Operator '/' expects numeric operands`, locOf(node));
        return promoteNumericType(lt, rt);
      }

      if (op === "%") {
        if (lt.kind !== "int" || rt.kind !== "int") cerror("Operator '%' expects int operands", locOf(node));
        return { kind: "int" };
      }

      // stream output (lowered during codegen)
      if (op === "<<") {
        return { kind: "unknown" };
      }

      if (["==", "!=", "<", ">", "<=", ">="].includes(op)) {
        // Allow unknown-typed comparisons (common with template stubs).
        // Codegen will emit the comparison op and the VM will validate at runtime.
        if (!lt || !rt) {
          cerror(`Invalid operands for '${op}' operator`, locOf(node));
        }
        if (lt.kind === "unknown" || rt.kind === "unknown") return { kind: "bool" };
        // numeric comparisons
        if (isNumeric(lt) && isNumeric(rt)) return { kind: "bool" };

        // pointer comparisons
        if (op === "==" || op === "!=") {
          // ptr == ptr (same pointee) OR related class pointers (single-inheritance upcasts)
          if (isPtrType(lt) && isPtrType(rt) && (sameType(lt, rt) || isAssignablePtr(lt, rt) || isAssignablePtr(rt, lt))) return { kind: "bool" };
          // ptr == null / null == ptr
          if ((isPtrType(lt) && isNullType(rt)) || (isNullType(lt) && isPtrType(rt))) return { kind: "bool" };
          // null == null
          if (isNullType(lt) && isNullType(rt)) return { kind: "bool" };
          // exact same non-numeric type (struct/class refs, bool, string, etc.)
          if (sameType(lt, rt)) return { kind: "bool" };
        }

        cerror(`Invalid operand types for '${op}'`, locOf(node));
      }

      if (["&&", "||"].includes(op)) {
        if (lt.kind !== "bool" || rt.kind !== "bool") cerror(`Operator '${op}' expects bool operands`, locOf(node));
        return { kind: "bool" };
      }

      cerror("Unsupported binary op: " + op, locOf(node));
    }

    if (node instanceof AST.CallExpr) {
      // v0.8 parser may represent calls as CallExpr(calleeExpr, args)
      // while v0.7 IRGen expected CallExpr(nameString, args) with node.name.
      // Preserve v0.7 behavior, but accept callee-expr forms too.
      if (typeof node.name === "string") {
        const sig = funcSigs.get(node.name);
        if (!sig) cerror(`Unknown function '${node.name}'`, locOf(node));
        if (node.args.length !== sig.params.length) {
          cerror(`Function '${node.name}' expects ${sig.params.length} args, got ${node.args.length}`, locOf(node));
        }
        return sig.retType;
      }

      const callee = node.callee;
      // function call: foo(...)
      if (callee instanceof AST.VarExpr) {
        const sig = funcSigs.get(callee.name);
        if (!sig) {
          // builtins: len(x), input(), input(prompt)
          if (BUILTINS.has(callee.name)) {
            if (callee.name === "len") {
              if (node.args.length !== 1) cerror("len() takes exactly one argument", locOf(node));
              const at = inferExprType(node.args[0]);
              if (at.kind !== "string" && at.kind !== "list") {
                cerror("len() unsupported type", locOf(node.args[0]));
              }
              return { kind: "int" };
            }
            if (callee.name === "input") {
              if (node.args.length !== 0 && node.args.length !== 1) {
                cerror("input() takes 0 or 1 argument", locOf(node));
              }
              if (node.args.length === 1) {
                const at = inferExprType(node.args[0]);
                if (at.kind !== "string") cerror("input() prompt must be a string", locOf(node.args[0]));
              }
              return { kind: "string" };
            }
          }
          cerror(`Unknown function '${callee.name}'`, locOf(node));
        }
        if (node.args.length !== sig.params.length) {
          cerror(`Function '${callee.name}' expects ${sig.params.length} args, got ${node.args.length}`, locOf(node));
        }
        return sig.retType;
      }

      // method call represented as CallExpr(FieldAccessExpr(...), args)
      if (callee instanceof AST.FieldAccessExpr) {
        const tmp = new AST.MethodCallExpr(callee.base, callee.field, node.args, locOf(node));
        return inferExprType(tmp);
      }

      // ptr method call represented as CallExpr(PtrFieldAccessExpr(...), args)
      if (callee instanceof AST.PtrFieldAccessExpr) {
        const tmp = new AST.PtrMethodCallExpr(callee.basePtr, callee.field, node.args, locOf(node));
        return inferExprType(tmp);
      }

      cerror("Unsupported call callee", locOf(node));
    }

    if (node instanceof AST.PrintStmt) {
      return { kind: "void" };
    }

    cerror("Unknown AST node in type inference: " + node.constructor.name, locOf(node));
  }

  // ----------------------------
  // Codegen helpers for promotion
  // ----------------------------
  function genExprWithExpectedType(expr, expectedType) {
    const actual = inferExprType(expr);

    // C++-style binding of temporaries to `const T&` parameters.
    // In this compiler, references are lowered to pointers at runtime.
    // If a parameter is represented as a pointer with {isRef:true,isConst:true}
    // and the argument is a value (e.g., literal `3`), create a temporary local
    // to hold the value and pass its address.
    if (
      expectedType.kind === 'ptr' &&
      expectedType.isRef &&
      expectedType.isConst &&
      (actual.kind === 'int' || actual.kind === 'float' || actual.kind === 'bool') &&
      sameType(expectedType.to, actual)
    ) {
      const tmp = freshTemp('__cref_tmp');
      // store the value into a local temp
      gen(expr);
      ir.emit('STORE', tmp);
      varTypes.set(tmp, expectedType.to);
      // pass pointer to temp
      ir.emit('ADDR_VAR', tmp);
      return expectedType;
    }

    // function pointer expected: allow function-name decay and pass-through
    if (expectedType.kind === "fnptr") {
      if (expr instanceof AST.VarExpr) {
        const base = expr.name.split("::").pop();
        const fSig = funcSigs.get(expr.name) || funcSigs.get(base);
        if (fSig) {
          ir.emit("LOAD_FUNC_ADDR", expr.name);
          return { kind: "fnptr", ret: fSig.retType, params: fSig.params };
        }
      }
      if (actual.kind === "fnptr") {
        gen(expr);
        return actual;
      }
      cerror("Type mismatch", locOf(expr));
      return actual;
    }

    gen(expr);

    if (expectedType.kind === "float" && actual.kind === "int") {
      ir.emit("I2F");
      return { kind: "float" };
    }
    if (expectedType.kind === "int" && actual.kind === "float") {
      cerror("Cannot implicitly convert float to int", locOf(expr));
    }
    if (expectedType.kind === "bool" && actual.kind !== "bool") {
      cerror("Expected bool expression", locOf(expr));
    }
    if (expectedType.kind === "string" && actual.kind !== "string") {
      cerror("Expected string expression", locOf(expr));
    }

    // pointers: allow null + upcasts for class pointers
    if (expectedType.kind === "ptr") {
      // v1.1 pragmatic: if the expression type is unknown (common with template stubs like std::vector<T>),
      // allow it to flow into a pointer-typed context. Runtime will still validate deref/null.
      if (actual.kind === "unknown") return expectedType;
      if (isAssignablePtr(expectedType, actual)) return actual;
      const expStr = JSON.stringify(expectedType);
      const actStr = JSON.stringify(actual);
      cerror(`Type mismatch (expected ptr ${expStr}, got ${actStr})`, locOf(expr));
      return actual;
    }

    // class/struct exact checks
    if ((expectedType.kind === "struct" || expectedType.kind === "class") && !sameType(expectedType, actual)) {
      cerror("Type mismatch", locOf(expr));
    }

    return actual;
  }


  // ----------------------------
  // Reference lowering helpers (T&)
  // ----------------------------
  // At runtime, references are represented as pointers.
  // This helper emits IR that leaves a pointer on the stack.
  function genAddrOfLValue(expr, expectedBaseType) {
    // Passing an existing reference: use its stored pointer.
    if (expr instanceof AST.VarExpr) {
      const vt = getVarType(expr.name);
      if (!vt) cerror(`Undefined variable '${expr.name}'`, locOf(expr));
      if (vt.kind === 'ref') {
        if (!sameType(vt.to, expectedBaseType)) {
          cerror('Type mismatch for reference binding', locOf(expr));
        }
        ir.emit('LOAD', expr.name);
        return;
      }
      if (!sameType(vt, expectedBaseType)) {
        cerror('Type mismatch for reference binding', locOf(expr));
      }
      ir.emit('ADDR_VAR', expr.name);
      return;
    }

    // ptr->field : take address of a field on a heap object
    if (expr instanceof AST.PtrFieldAccessExpr) {
      const pt = inferExprType(expr.basePtr);
      if (!isPtrType(pt)) cerror('ptr->field on non-pointer', locOf(expr));
      const base = pt.to;
      if (base.kind !== 'struct' && base.kind !== 'class') cerror('ptr->field on non-aggregate', locOf(expr));
      const layout = base.kind === 'struct' ? mustGetStructLayout(base.name, locOf(expr)) : mustGetClassLayout(base.name, locOf(expr));
      const off = layout.fieldIndex.get(expr.field);
      if (off === undefined) cerror(`${base.kind === 'struct' ? 'Struct' : 'Class'} '${base.name}' has no field '${expr.field}'`, locOf(expr));
      const ft = typeFromName(layout.fieldTypes[off]);
      if (!sameType(ft, expectedBaseType)) cerror('Type mismatch for reference binding', locOf(expr));
      gen(expr.basePtr);
      ir.emit('ADDR_PTR_FIELD', off);
      return;
    }

    // this.field : treat as ptr-field on $this
    if (expr instanceof AST.FieldAccessExpr && expr.base instanceof AST.ThisExpr) {
      const baseT = currentThisType;
      if (!baseT || baseT.kind !== 'class') cerror('this.field outside method', locOf(expr));
      const layout = mustGetClassLayout(baseT.name, locOf(expr));
      const off = layout.fieldIndex.get(expr.field);
      if (off === undefined) cerror(`Class '${baseT.name}' has no field '${expr.field}'`, locOf(expr));
      const ft = typeFromName(layout.fieldTypes[off]);
      if (!sameType(ft, expectedBaseType)) cerror('Type mismatch for reference binding', locOf(expr));
      ir.emit('LOAD', '$this');
      ir.emit('ADDR_PTR_FIELD', off);
      return;
    }

    cerror('Reference binding requires an addressable lvalue', locOf(expr));
  }

  function genRefArg(expr, expectedRefType) {
    if (!expectedRefType || expectedRefType.kind !== 'ref') {
      cerror('internal: genRefArg expects ref type', locOf(expr));
    }
    genAddrOfLValue(expr, expectedRefType.to);
  }

  function genNumericBinary(node, opForIntDiv = null, opForNormal = null) {
    const lt = inferExprType(node.left);
    const rt = inferExprType(node.right);

    // If unknown is involved (e.g., list indexing), emit op and let VM runtime handle it.
    if (lt.kind === "unknown" || rt.kind === "unknown") {
      gen(node.left);
      gen(node.right);

      if (node.op === "/") {
        cerror("Operator '/' with unknown operands is not allowed (need numeric types)", locOf(node));
      }

      if (!opForNormal) cerror("Internal error: missing binary op mapping", locOf(node));
      ir.emit(opForNormal);
      return { kind: "unknown" };
    }

    if (!isNumeric(lt) || !isNumeric(rt)) {
      cerror(`Operator '${node.op}' expects numeric operands`, locOf(node));
    }
    const outT = promoteNumericType(lt, rt);

    gen(node.left);
    if (outT.kind === "float" && lt.kind === "int") ir.emit("I2F");

    gen(node.right);
    if (outT.kind === "float" && rt.kind === "int") ir.emit("I2F");

    if (opForIntDiv && opForNormal && node.op === "/") {
      if (outT.kind === "int") ir.emit(opForIntDiv);
      else ir.emit(opForNormal);
    } else if (opForNormal) {
      ir.emit(opForNormal);
    } else {
      cerror("Internal error: missing binary op mapping", locOf(node));
    }
    return outT;
  }

  function genComparison(node, irOp) {
    const lt = inferExprType(node.left);
    const rt = inferExprType(node.right);

    // unknown-typed comparisons: emit op directly and let runtime validate
    if (lt.kind === "unknown" || rt.kind === "unknown") {
      gen(node.left);
      gen(node.right);
      ir.emit(irOp);
      return { kind: "bool" };
    }

    // numeric comparison with promotion
    if (isNumeric(lt) && isNumeric(rt)) {
      const outT = promoteNumericType(lt, rt);

      gen(node.left);
      if (outT.kind === "float" && lt.kind === "int") ir.emit("I2F");

      gen(node.right);
      if (outT.kind === "float" && rt.kind === "int") ir.emit("I2F");

      ir.emit(irOp);
      return { kind: "bool" };
    }

    // pointer equality / inequality
    if ((irOp === "EQ" || irOp === "NE")) {
      // ptr == ptr (same type) OR related class pointers (single-inheritance upcasts)
      if (isPtrType(lt) && isPtrType(rt) && (sameType(lt, rt) || isAssignablePtr(lt, rt) || isAssignablePtr(rt, lt))) {
        gen(node.left);
        gen(node.right);
        ir.emit(irOp);
        return { kind: "bool" };
      }
      // ptr == null or null == ptr
      if ((isPtrType(lt) && isNullType(rt)) || (isNullType(lt) && isPtrType(rt))) {
        gen(node.left);
        gen(node.right);
        ir.emit(irOp);
        return { kind: "bool" };
      }
      // null == null
      if (isNullType(lt) && isNullType(rt)) {
        gen(node.left);
        gen(node.right);
        ir.emit(irOp);
        return { kind: "bool" };
      }
      // exact same non-numeric type
      if (sameType(lt, rt)) {
        gen(node.left);
        gen(node.right);
        ir.emit(irOp);
        return { kind: "bool" };
      }
    }

    cerror(`Invalid operand types for '${node.op}'`, locOf(node));
  }

  // ----------------------------
  // IR Generation
  // ----------------------------
  let inCatchDepth = 0;
  let inDestructor = false;

  function stmtAlwaysTerminates(s) {
    if (!s) return false;
    if (s instanceof AST.ReturnStmt) return true;
    if (s instanceof AST.ThrowStmt) return true;
    return false;
  }

  function gen(node) {
    if (!node) return;

    // Allow statement lists (parser represents blocks as arrays)
    if (Array.isArray(node)) {
      let terminated = false;
      for (const s of node) {
        if (terminated) {
          cerror("Unreachable statement after return/throw", locOf(s));
        }
        gen(s);
        if (stmtAlwaysTerminates(s)) terminated = true;
      }
      return;
    }

    // ---------- VAR DECL ----------
    if (node instanceof AST.VarDecl) {
      const ty = typeFromName(node.typeName);

      // references (T&): must be initialized with an lvalue; stored as pointers
      if (ty.kind === 'ref') {
        if (!node.init) cerror('Reference variables must be initialized', locOf(node));
        genAddrOfLValue(node.init, ty.to);
        ir.emit('STORE', node.name);
        varTypes.set(node.name, ty);
        return;
      }

      if (node.init) {
        // struct init: clone for value semantics
        if (ty.kind === "struct") {
          const initTy = inferExprType(node.init);
          if (initTy.kind !== "struct" || initTy.name !== ty.name) {
            cerror(`Cannot initialize struct '${ty.name}' with non-matching type`, locOf(node));
          }
          gen(node.init);
          ir.emit("CLONE_STRUCT");
          ir.emit("STORE", node.name);
          varTypes.set(node.name, ty);
          return;
        }

        // class init: reference semantics
        if (ty.kind === "class") {
          const initTy = inferExprType(node.init);
          if (initTy.kind !== "class" || initTy.name !== ty.name) {
            cerror(`Cannot initialize class '${ty.name}' with non-matching type`, locOf(node));
          }
          gen(node.init);
          ir.emit("STORE", node.name);
          varTypes.set(node.name, ty);
          return;
        }

        // v0.7: pointer init
        if (ty.kind === "ptr") {
          const it = inferExprType(node.init);
          if (!isAssignablePtr(ty, it)) {
            cerror("Cannot initialize pointer with non-matching type", locOf(node));
          }
          gen(node.init);
          
          ir.emit("STORE", node.name);
          varTypes.set(node.name, ty);
          return;
        }

        // primitive init with numeric promotion
        if (ty.kind === "float") genExprWithExpectedType(node.init, { kind: "float" });
        else if (ty.kind === "int") genExprWithExpectedType(node.init, { kind: "int" });
        else if (ty.kind === "bool") genExprWithExpectedType(node.init, { kind: "bool" });
        else if (ty.kind === "string") genExprWithExpectedType(node.init, { kind: "string" });
        else gen(node.init);
      } else {
        // default init
        if (ty.kind === "int") ir.emit("PUSH_CONST", 0);
        else if (ty.kind === "float") ir.emit("PUSH_CONST", 0.0);
        else if (ty.kind === "bool") ir.emit("PUSH_CONST", false);
        else if (ty.kind === "string") ir.emit("PUSH_CONST", "");
        else if (ty.kind === "struct") {
          const L = mustGetStructLayout(ty.name, locOf(node));
          ir.emit("ALLOC_STRUCT", { name: ty.name, n: L.n });
        } else if (ty.kind === "class") {
          const L = mustGetClassLayout(ty.name, locOf(node));
          ir.emit("ALLOC_OBJ", { className: ty.name, n: L.n });
        } else if (ty.kind === "ptr") {
          // null pointer
          ir.emit("PUSH_CONST", 0);
        } else {
          ir.emit("PUSH_CONST", null);
        }
      }

      ir.emit("STORE", node.name);
      // v0.9 continuation: register stack object destructors for unwinding/return
      if (!node.init && ty.kind === "class") {
        ir.emit("REGISTER_DTOR", { var: node.name, className: ty.name });
      }
      varTypes.set(node.name, ty);
      return;
    }

    // ---------- ASSIGN ----------
    if (node instanceof AST.AssignStmt) {
      const vt = getVarType(node.name);
      if (!vt) cerror(`Undefined variable '${node.name}'`, locOf(node));

      // references: assignment writes through the pointer (cannot reseat)
      if (vt.kind === 'ref') {
        if (vt.isConst) cerror(`Cannot assign to const reference '${node.name}'`, locOf(node));
        ir.emit('LOAD', node.name);
        // value to write
        genExprWithExpectedType(node.expr, vt.to);
        ir.emit('STORE_PTR');
        return;
      }

      if (vt.kind === "struct") {
        const rhsT = inferExprType(node.expr);
        if (rhsT.kind !== "struct" || rhsT.name !== vt.name) {
          cerror(`Cannot assign non-matching struct type to '${node.name}'`, locOf(node));
        }
        gen(node.expr);
        ir.emit("CLONE_STRUCT");
        ir.emit("STORE", node.name);
        return;
      }

      if (vt.kind === "class") {
        const rhsT = inferExprType(node.expr);
        if (rhsT.kind !== "class" || rhsT.name !== vt.name) {
          cerror(`Cannot assign non-matching class type to '${node.name}'`, locOf(node));
        }
        gen(node.expr);
        ir.emit("STORE", node.name);
        return;
      }

      // v0.7 pointer assign
      if (vt.kind === "ptr") {
        const rt = inferExprType(node.expr);
        if (!isAssignablePtr(vt, rt)) {
          cerror(`Cannot assign non-matching pointer type to '${node.name}'`, locOf(node));
        }
        gen(node.expr);
        ir.emit("STORE", node.name);
        return;
      }

      if (vt.kind === "float") genExprWithExpectedType(node.expr, { kind: "float" });
      else if (vt.kind === "int") genExprWithExpectedType(node.expr, { kind: "int" });
      else if (vt.kind === "bool") genExprWithExpectedType(node.expr, { kind: "bool" });
      else if (vt.kind === "string") genExprWithExpectedType(node.expr, { kind: "string" });
      else gen(node.expr);

      ir.emit("STORE", node.name);
      return;
    }

    // ---------- ASSIGN FIELD ----------
    if (node instanceof AST.AssignFieldStmt) {
      const baseT = inferAggregateTypeFromBaseExpr(node.base);
      if (!baseT) cerror("Field assignment on non-struct/class", locOf(node));

      if (baseT.kind === "struct") {
        const layout = mustGetStructLayout(baseT.name, locOf(node));
        const offset = layout.fieldIndex.get(node.field);
        if (offset === undefined) cerror(`Struct '${baseT.name}' has no field '${node.field}'`, locOf(node));

        gen(node.base);

        const fieldT = typeFromName(layout.fieldTypes[offset]);
        if (fieldT.kind === "float") genExprWithExpectedType(node.value, { kind: "float" });
        else if (fieldT.kind === "int") genExprWithExpectedType(node.value, { kind: "int" });
        else if (fieldT.kind === "bool") genExprWithExpectedType(node.value, { kind: "bool" });
        else if (fieldT.kind === "string") genExprWithExpectedType(node.value, { kind: "string" });
        else gen(node.value);

        ir.emit("STORE_FIELD", { offset });
        return;
      }

      // class field assignment
      const layout = mustGetClassLayout(baseT.name, locOf(node));
      const offset = layout.fieldIndex.get(node.field);
      const isRO = !!layout.fieldReadonly?.[offset];
      if (isRO) {
        // writable only from within the declaring class, through 'this'
        const isThis = node.base instanceof AST.ThisExpr;
        if (!(inMethod && currentClassName === baseT.name && isThis)) {
          cerror(`Cannot assign to readonly field '${baseT.name}.${node.field}'`, locOf(node));
        }
      }

            if (offset === undefined) cerror(`Class '${baseT.name}' has no field '${node.field}'`, locOf(node));

      gen(node.base);

      const fieldT = typeFromName(layout.fieldTypes[offset]);
      if (fieldT.kind === "float") genExprWithExpectedType(node.value, { kind: "float" });
      else if (fieldT.kind === "int") genExprWithExpectedType(node.value, { kind: "int" });
      else if (fieldT.kind === "bool") genExprWithExpectedType(node.value, { kind: "bool" });
      else if (fieldT.kind === "string") genExprWithExpectedType(node.value, { kind: "string" });
      else gen(node.value);

      ir.emit("STORE_FIELD", { offset });
      return;
    }

    // v0.7: ASSIGN PTR FIELD: p->field = value;
    if (node instanceof AST.AssignPtrFieldStmt) {
      const pt = inferExprType(node.basePtr);
      if (!isPtrType(pt)) cerror("ptr->field assignment on non-pointer", locOf(node));
      const base = pt.to;

      let offset, fieldT;

      if (base.kind === "struct") {
        const layout = mustGetStructLayout(base.name, locOf(node));
        offset = layout.fieldIndex.get(node.field);
        if (offset === undefined) cerror(`Struct '${base.name}' has no field '${node.field}'`, locOf(node));
        fieldT = typeFromName(layout.fieldTypes[offset]);
      } else if (base.kind === "class") {
        const layout = mustGetClassLayout(base.name, locOf(node));
        offset = layout.fieldIndex.get(node.field);
        const isRO = !!layout.fieldReadonly?.[offset];
        if (isRO) {
          cerror(`Cannot assign to readonly field '${base.name}.${node.field}'`, locOf(node));
        }
        if (offset === undefined) cerror(`Class '${base.name}' has no field '${node.field}'`, locOf(node));
        fieldT = typeFromName(layout.fieldTypes[offset]);
      } else {
        cerror("ptr->field assignment expects pointer to struct/class", locOf(node));
      }

      // stack order should mirror STORE_FIELD: [ptr, value] then op pops value then ptr
      gen(node.basePtr);

      if (fieldT.kind === "float") genExprWithExpectedType(node.value, { kind: "float" });
      else if (fieldT.kind === "int") genExprWithExpectedType(node.value, { kind: "int" });
      else if (fieldT.kind === "bool") genExprWithExpectedType(node.value, { kind: "bool" });
      else if (fieldT.kind === "string") genExprWithExpectedType(node.value, { kind: "string" });
      else if (fieldT.kind === "struct") {
        const at = inferExprType(node.value);
        if (at.kind !== "struct" || at.name !== fieldT.name) cerror("Type mismatch in ptr field store", locOf(node.value));
        gen(node.value);
        ir.emit("CLONE_STRUCT");
      } else if (fieldT.kind === "class") {
        const at = inferExprType(node.value);
        if (at.kind !== "class" || at.name !== fieldT.name) cerror("Type mismatch in ptr field store", locOf(node.value));
        gen(node.value);
      } else {
        gen(node.value);
      }

      ir.emit("STORE_PTR_FIELD", { offset });
      return;
    }

    // v1.1: ASSIGN PTR: *p = value;
    if (node instanceof AST.AssignPtrStmt) {
      const pt = inferExprType(node.ptrExpr);
      if (!isPtrType(pt)) cerror("*p assignment on non-pointer", locOf(node));

      const elemT = pt.to;

      // stack order: [ptr, value] then STORE_PTR pops value then ptr
      gen(node.ptrExpr);
      if (elemT.kind === "float") genExprWithExpectedType(node.expr, { kind: "float" });
      else if (elemT.kind === "int") genExprWithExpectedType(node.expr, { kind: "int" });
      else if (elemT.kind === "bool") genExprWithExpectedType(node.expr, { kind: "bool" });
      else if (elemT.kind === "string") genExprWithExpectedType(node.expr, { kind: "string" });
      else if (elemT.kind === "struct") {
        const at = inferExprType(node.expr);
        if (at.kind !== "struct" || at.name !== elemT.name) cerror("Type mismatch in ptr store", locOf(node.expr));
        gen(node.expr);
        ir.emit("CLONE_STRUCT");
      } else {
        // pointers/classes etc
        gen(node.expr);
      }
      ir.emit("STORE_PTR");
      return;
    }

    // ---------- DELETE ----------
    if (node instanceof AST.DeleteStmt) {
      // delete expr;  (allow delete null as runtime no-op)
      const t = inferExprType(node.expr);
      if (!(t.kind === "ptr" || t.kind === "null")) {
        cerror("delete expects a pointer (or null)", locOf(node));
      }
      gen(node.expr);
      ir.emit("FREE_OBJECT");
      return;
    }

    // ---------- THROW (v0.9) ----------
    if (node instanceof AST.ThrowStmt) {
      if (inDestructor) {
        cerror("Throwing from a destructor is forbidden in v0.9", locOf(node));
      }

      if (!node.expr) {
        // "throw;" = rethrow (must be inside a catch)
        if (inCatchDepth <= 0) {
          cerror("'throw;' is only valid inside a catch block", locOf(node));
        }
        ir.emit("RETHROW");
        return;
      }

      gen(node.expr);
      ir.emit("THROW");
      return;
    }

    // ---------- TRY/CATCH (v0.9) ----------
    if (node instanceof AST.TryCatchStmt) {
      // AST shape may vary across versions. Normalize:
      const catchClause = node.catchClause || null;

      function _pickTypeName(v) {
        if (!v) return null;
        if (typeof v === "string") return v;
        // common shapes from various parser versions
        if (typeof v.typeName === "string") return v.typeName;
        if (typeof v.name === "string") return v.name;
        if (typeof v.text === "string") return v.text;
        if (typeof v.value === "string") return v.value;
        if (typeof v.base === "string") return v.base; // e.g., { base: "int", ptrDepth: 1 }
        return null;
      }

      // Some parser versions store the catch type as a pre-built type object; keep it around.
      const catchTypeAst =
        node.catchType ||
        node.catchDeclType ||
        (catchClause ? (catchClause.type || catchClause.catchType || catchClause.declType) : null) ||
        (catchClause && catchClause.decl ? (catchClause.decl.type || catchClause.decl.declType) : null) ||
        (node.catchDecl ? (node.catchDecl.type || node.catchDecl.declType) : null);

      const catchTypeName =
        _pickTypeName(node.catchTypeName) ||
        _pickTypeName(node.catchType) ||
        _pickTypeName(node.catchDeclType) ||
        (catchClause ? (_pickTypeName(catchClause.typeName) || _pickTypeName(catchClause.type) || _pickTypeName(catchClause.catchType) || _pickTypeName(catchClause.declType)) : null) ||
        (catchClause && catchClause.decl ? (_pickTypeName(catchClause.decl.typeName) || _pickTypeName(catchClause.decl.type) || _pickTypeName(catchClause.decl.declType)) : null) ||
        (node.catchDecl ? (_pickTypeName(node.catchDecl.typeName) || _pickTypeName(node.catchDecl.type) || _pickTypeName(node.catchDecl.declType)) : null);

      let catchName =
        (typeof node.catchName === "string" ? node.catchName : null) ||
        (typeof node.catchVar === "string" ? node.catchVar : null) ||
        (typeof node.catchIdent === "string" ? node.catchIdent : null) ||
        (catchClause ? (catchClause.catchName || catchClause.name || catchClause.varName || catchClause.ident || catchClause.paramName) : null);

      // Robustly extract catch variable name across AST shapes.
      if (catchName == null) {
        const cc = node.catchClause || node.catch || null;
        const cand =
          (node.catchParam && (node.catchParam.name || node.catchParam.ident || node.catchParam.id)) ||
          node.catchParamName ||
          (cc && cc.param && (cc.param.name || cc.param.ident || cc.param.id)) ||
          (cc && cc.paramName) ||
          (cc && cc.decl && (cc.decl.name || cc.decl.ident || cc.decl.id)) ||
          (node.catchDecl && (node.catchDecl.name || node.catchDecl.ident || node.catchDecl.id)) ||
          null;
        if (cand && typeof cand === "object") {
          catchName = cand.name || cand.value || cand.text || cand.id || null;
        } else if (typeof cand === "string") {
          catchName = cand;
        }
      }

      // Determine catch type. Missing type => catch-all.
      let catchTy = null;
      if (typeof catchTypeName === "string" && catchTypeName.length > 0) {
        catchTy = typeFromName(catchTypeName);
      } else if (catchTypeAst && typeof catchTypeAst === "object" && typeof catchTypeAst.kind === "string") {
        catchTy = catchTypeAst;
      } else {
        // catch-all
        catchTy = null;
      }

      // Optional catch binding name. If missing, do not bind.
      let bindName = null;
      if (typeof catchName === "string" && catchName.length > 0) bindName = catchName;

      // In C++ style, catch-all cannot bind a named variable.
      if (catchTy == null && bindName != null) {
        cerror("catch (...) cannot bind a variable name", locOf(node));
      }

      // Shadowing: save/restore any existing binding to avoid false "duplicate" errors.
      const hadOld = bindName != null && varTypes.has(bindName);
      const oldTy = hadOld ? varTypes.get(bindName) : null;

      if (bindName != null) {
        varTypes.set(bindName, catchTy);
      }

      const catchTypeDesc = catchTy ? compileCatchType(catchTy) : null;
      const pushIdx = ir.emit("PUSH_HANDLER", { catchTarget: -1, catchType: catchTypeDesc, catchVar: bindName });

      const tryStmts =
        Array.isArray(node.tryBody) ? node.tryBody :
        (node.tryBody && Array.isArray(node.tryBody.stmts)) ? node.tryBody.stmts :
        (catchClause && Array.isArray(catchClause.tryBody)) ? catchClause.tryBody :
        (catchClause && catchClause.tryBody && Array.isArray(catchClause.tryBody.stmts)) ? catchClause.tryBody.stmts :
        [];

      for (let i = 0; i < tryStmts.length; i++) {
        const s = tryStmts[i];
        gen(s);
        if (stmtAlwaysTerminates(s) && i + 1 < tryStmts.length) {
          cerror("Unreachable statement after terminator", locOf(tryStmts[i + 1]));
        }
      }

      ir.emit("POP_HANDLER");
      const jEnd = ir.emit("JUMP", null);

      const catchTarget = ir.instructions.length;
      const old = ir.instructions[pushIdx].arg;
      ir.patch(pushIdx, { ...old, catchTarget });

      ir.emit("ENTER_CATCH");
      inCatchDepth++;

      const catchStmts =
        Array.isArray(node.catchBody) ? node.catchBody :
        (node.catchBody && Array.isArray(node.catchBody.stmts)) ? node.catchBody.stmts :
        (catchClause && Array.isArray(catchClause.body)) ? catchClause.body :
        (catchClause && catchClause.body && Array.isArray(catchClause.body.stmts)) ? catchClause.body.stmts :
        (catchClause && catchClause.catchBody && Array.isArray(catchClause.catchBody.stmts)) ? catchClause.catchBody.stmts :
        [];

      for (let i = 0; i < catchStmts.length; i++) {
        const s = catchStmts[i];
        gen(s);
        if (stmtAlwaysTerminates(s) && i + 1 < catchStmts.length) {
          cerror("Unreachable statement after terminator", locOf(catchStmts[i + 1]));
        }
      }

      inCatchDepth--;
      ir.emit("LEAVE_CATCH");

      // restore shadowed binding
      if (bindName != null) {
        if (hadOld) varTypes.set(bindName, oldTy);
        else varTypes.delete(bindName);
      }

      ir.patch(jEnd, ir.instructions.length);
      return;
    }


    // ---------- STRING LITERAL ----------
    if (node instanceof AST.StringLiteral) {
      ir.emit("PUSH_CONST", node.value);
      return;
    }

    // ---------- ASSIGN INDEX ----------
    if (node instanceof AST.AssignIndexStmt) {
      gen(node.list);
      gen(node.index);
      gen(node.value);
      ir.emit("STORE_INDEX");
      return;
    }

    // ---------- EXPR STMT ----------
    if (node instanceof AST.ExprStmt) {
      const t = inferExprType(node.expr);
      gen(node.expr);
      if (t && t.kind !== "void") ir.emit("POP");
      return;
    }

    // ---------- LITERALS ----------
    if (node instanceof AST.IntLiteral) {
      ir.emit("PUSH_CONST", node.value);
      return;
    }
    if (node instanceof AST.FloatLiteral) {
      ir.emit("PUSH_CONST", node.value);
      return;
    }
    if (node instanceof AST.BoolLiteral) {
      ir.emit("PUSH_CONST", !!node.value);
      return;
    }

    // v0.7: NULL literal -> pointer null (use 0 as canonical null pointer)
    if (node instanceof AST.NullLiteral) {
      ir.emit("PUSH_CONST", 0);
      return;
    }

    // v0.7: NEW expression
    if (node instanceof AST.NewExpr) {
      const base = typeFromName(node.typeName);
      if (base.kind !== "struct" && base.kind !== "class") {
        cerror(`'new' expects a struct/class type, got '${node.typeName}'`, locOf(node));
      }
      if (node.args && node.args.length !== 0) {
        cerror("v0.7 new only supports 'new T()' with no constructor args", locOf(node));
      }

      if (base.kind === "struct") {
        const L = mustGetStructLayout(base.name, locOf(node));
        ir.emit("ALLOC_OBJECT", { kind: "struct", name: base.name, n: L.n });
        return;
      } else {
        const L = mustGetClassLayout(base.name, locOf(node));
        ir.emit("ALLOC_OBJECT", { kind: "class", name: base.name, n: L.n });
        return;
      }
    }

    // ---------- THIS ----------
    if (node instanceof AST.ThisExpr) {
      if (!inMethod) cerror("Use of 'this' outside a method", locOf(node));
      ir.emit("LOAD", "$this");
      return;
    }

    // ---------- VAR ----------
    if (node instanceof AST.VarExpr) {
      const vt = getVarType(node.name);
      if (!vt) cerror(`Undefined variable '${node.name}'`, locOf(node));
      if (vt.kind === 'ref') {
        // runtime: references are stored as pointers
        ir.emit('LOAD', node.name);
        ir.emit('LOAD_PTR');
        return;
      }
      ir.emit("LOAD", node.name);
      return;
    }

    // ---------- LIST ----------
    if (node instanceof AST.ListLiteral) {
      for (const el of node.elements) gen(el);
      ir.emit("BUILD_LIST", node.elements.length);
      return;
    }

    // ---------- INDEX ----------
    if (node instanceof AST.IndexExpr) {
      gen(node.list);
      gen(node.index);
      ir.emit("LOAD_INDEX");
      return;
    }

    // ---------- FIELD ACCESS ----------
    if (node instanceof AST.FieldAccessExpr) {
      const baseT = inferAggregateTypeFromBaseExpr(node.base);
      if (!baseT) cerror("Field access on non-struct/class", locOf(node));

      if (baseT.kind === "struct") {
        const layout = mustGetStructLayout(baseT.name, locOf(node));
        const offset = layout.fieldIndex.get(node.field);
        if (offset === undefined) cerror(`Struct '${baseT.name}' has no field '${node.field}'`, locOf(node));
        gen(node.base);
        ir.emit("LOAD_FIELD", { offset });
        return;
      }

      const layout = mustGetClassLayout(baseT.name, locOf(node));
      const offset = layout.fieldIndex.get(node.field);
      if (offset === undefined) cerror(`Class '${baseT.name}' has no field '${node.field}'`, locOf(node));
      gen(node.base);
      ir.emit("LOAD_FIELD", { offset });
      return;
    }

    // v0.7: PTR FIELD ACCESS: p->field
    if (node instanceof AST.PtrFieldAccessExpr) {
      const pt = inferExprType(node.basePtr);
      if (!isPtrType(pt)) cerror("ptr->field on non-pointer", locOf(node));
      const base = pt.to;

      let offset;
      if (base.kind === "struct") {
        const layout = mustGetStructLayout(base.name, locOf(node));
        offset = layout.fieldIndex.get(node.field);
        if (offset === undefined) cerror(`Struct '${base.name}' has no field '${node.field}'`, locOf(node));
      } else if (base.kind === "class") {
        const layout = mustGetClassLayout(base.name, locOf(node));
        offset = layout.fieldIndex.get(node.field);
        if (offset === undefined) cerror(`Class '${base.name}' has no field '${node.field}'`, locOf(node));
      } else {
        cerror("ptr->field expects pointer to struct/class", locOf(node));
      }

      gen(node.basePtr);
      ir.emit("LOAD_PTR_FIELD", { offset });
      return;
    }

    // ---------- METHOD CALL ----------
    if (node instanceof AST.MethodCallExpr) {
      const baseT = inferExprType(node.base);
      let classTy = baseT;
      if (baseT && baseT.kind === 'ptr' && baseT.to && baseT.to.kind === 'class') {
        classTy = baseT.to;
      }
      
// Built-in string methods (intrinsics)
if (baseT && baseT.kind === "string") {
  if (node.methodName === "size" || node.methodName === "length") {
    if ((node.args || []).length !== 0) cerror("string.size/length takes no arguments", locOf(node));
    gen(node.base);
    ir.emit("STR_LEN");
    return;
  }
  if (node.methodName === "push_back") {
    if ((node.args || []).length !== 1) cerror("string.push_back expects 1 argument", locOf(node));
    // We support mutation only for variable bases for now.
    if (!(node.base instanceof AST.VarExpr)) cerror("string.push_back only supported on variables", locOf(node));
    // load current string
    gen(node.base);
    // load char argument (char literals are ints in this compiler)
    genExprWithExpectedType(node.args[0], { kind: "int" });
    ir.emit("STR_APPEND_CHAR"); // returns new string
    // store back
    ir.emit("STORE", node.base.name);
    // push void marker
    ir.emit("PUSH_CONST", null);
    ir.emit("POP");
    return;
  }
  if (node.methodName === "c_str") {
    if ((node.args || []).length !== 0) cerror("string.c_str takes no arguments", locOf(node));
    gen(node.base);
    // represent c_str as pointer-to-char to string constant (VM uses JS string; treat as unknown ptr)
    // We'll just leave it as string for now; most code won't dereference it.
    return;
  }
  cerror(`Unsupported string method '${node.methodName}'`, locOf(node));
}

if (!classTy || classTy.kind !== "class") cerror("Method call on non-class", locOf(node));
      
      // Special handling for stream operators - they're lowered to PRINT_INLINE, not method calls
      if ((node.methodName === "operator<<" && (classTy.name === "ostream" || classTy.name === "std::ostream")) ||
          (node.methodName === "operator>>" && (classTy.name === "istream" || classTy.name === "std::istream"))) {
        // This should have been caught as a BinaryExpr, but if we get here, handle it specially
        if (node.args && node.args.length === 1) {
          gen(node.args[0]);
          ir.emit("PRINT_INLINE");
          // Return reference to stream (dummy value) - push a dummy
          ir.emit("PUSH_CONST", 0);
          return;
        }
        cerror("operator<< expects exactly one argument", locOf(node));
      }
      
      const layout = mustGetClassLayout(classTy.name, locOf(node));
      const ms = layout.methods.get(node.methodName);
      if (!ms) {
        // If stream operators are not found, it might be because we skipped them - handle specially
        if ((node.methodName === "operator<<" && (classTy.name === "ostream" || classTy.name === "std::ostream")) ||
            (node.methodName === "operator>>" && (classTy.name === "istream" || classTy.name === "std::istream"))) {
          if (node.args && node.args.length === 1) {
            gen(node.args[0]);
            ir.emit("PRINT_INLINE");
            ir.emit("PUSH_CONST", 0);
            return;
          }
          cerror("operator<< expects exactly one argument", locOf(node));
        }
        cerror(`Class '${classTy.name}' has no method '${node.methodName}'`, locOf(node));
      }

      // push receiver first
      gen(node.base);

      // then args
      for (let i = 0; i < node.args.length; i++) {
        const expected = ms.params[i] || { kind: "unknown" };
        if (expected.kind === "float") genExprWithExpectedType(node.args[i], { kind: "float" });
        else if (expected.kind === "int") genExprWithExpectedType(node.args[i], { kind: "int" });
        else if (expected.kind === "bool") genExprWithExpectedType(node.args[i], { kind: "bool" });
        else if (expected.kind === "string") genExprWithExpectedType(node.args[i], { kind: "string" });
        else if (expected.kind === "struct") {
          const at = inferExprType(node.args[i]);
          if (at.kind !== "struct" || at.name !== expected.name) {
            cerror(`Cannot pass non-matching struct to parameter ${i}`, locOf(node.args[i]));
          }
          gen(node.args[i]);
          ir.emit("CLONE_STRUCT");
        } else if (expected.kind === "class") {
          const at = inferExprType(node.args[i]);
          if (at.kind !== "class" || at.name !== expected.name) {
            cerror(`Cannot pass non-matching class to parameter ${i}`, locOf(node.args[i]));
          }
          gen(node.args[i]); // reference
        } else if (expected.kind === "ptr") {
          genExprWithExpectedType(node.args[i], expected);
        } else {
          gen(node.args[i]);
        }
      }

      ir.emit("CALL_METHOD", { className: baseT.name, methodName: node.methodName, argc: node.args.length });
      return;
    }

    // v0.8: PTR METHOD CALL: p->method(args) with virtual dispatch
    if (node instanceof AST.PtrMethodCallExpr) {
      const pt = inferExprType(node.basePtr);
      if (!isPtrType(pt)) cerror("ptr->method call on non-pointer", locOf(node));
      const base = pt.to;
      if (!base || base.kind !== "class") cerror("ptr->method requires pointer to class", locOf(node));

      const layout = mustGetClassLayout(base.name, locOf(node));
      const ms = layout.methods.get(node.methodName);
      if (!ms) cerror(`Class '${base.name}' has no method '${node.methodName}'`, locOf(node));

      // If we have a vtable slot for this method on the *static* base type, emit virtual dispatch.
      const vt = vtableLayouts.get(base.name);
      const slot = vt ? vt.slotIndex.get(node.methodName) : null;

      if (slot !== null && slot !== undefined) {
        // Load object from pointer once and keep it in a temp local so we can both:
        //  - look up the dynamic function via the vtable, and
        //  - pass the receiver as $arg0 to the callee.
        const tmpObj = freshTemp("__vt_obj");
        const tmpFn = freshTemp("__vt_fn");

        // tmpObj = *p
        gen(node.basePtr);
        ir.emit("LOAD_PTR");
        ir.emit("STORE_VAR", tmpObj);

        // tmpFn = tmpObj.vtable[slot]
        ir.emit("LOAD_VAR", tmpObj);
        ir.emit("LOAD_VTABLE");
        ir.emit("LOAD_VFUNC", slot);
        ir.emit("STORE_VAR", tmpFn);

        // Push receiver + args, then push function pointer and call indirectly.
        ir.emit("LOAD_VAR", tmpObj);

        for (let i = 0; i < node.args.length; i++) {
          const expected = ms.params[i] || { kind: "unknown" };
          if (expected.kind === "ref") {
            genRefArg(node.args[i], expected);
          } else if (expected.kind === "float") genExprWithExpectedType(node.args[i], { kind: "float" });
          else if (expected.kind === "int") genExprWithExpectedType(node.args[i], { kind: "int" });
          else if (expected.kind === "bool") genExprWithExpectedType(node.args[i], { kind: "bool" });
          else if (expected.kind === "string") genExprWithExpectedType(node.args[i], { kind: "string" });
          else if (expected.kind === "struct") {
            const at = inferExprType(node.args[i]);
            if (at.kind !== "struct" || at.name !== expected.name) {
              cerror(`Cannot pass non-matching struct to parameter ${i}`, locOf(node.args[i]));
            }
            gen(node.args[i]);
            ir.emit("CLONE_STRUCT");
          } else if (expected.kind === "class") {
            const at = inferExprType(node.args[i]);
            if (at.kind !== "class" || at.name !== expected.name) {
              cerror(`Cannot pass non-matching class to parameter ${i}`, locOf(node.args[i]));
            }
            gen(node.args[i]);
          } else if (expected.kind === "ptr") {
            genExprWithExpectedType(node.args[i], expected);
          } else {
            gen(node.args[i]);
          }
        }

        ir.emit("LOAD_VAR", tmpFn);
        ir.emit("CALL_INDIRECT", node.args.length + 1);
        return;
      }

      // Fallback: static dispatch (no vtable slot).
      gen(node.basePtr);
      ir.emit("LOAD_PTR");

      for (let i = 0; i < node.args.length; i++) {
        const expected = ms.params[i] || { kind: "unknown" };
        if (expected.kind === "float") genExprWithExpectedType(node.args[i], { kind: "float" });
        else if (expected.kind === "int") genExprWithExpectedType(node.args[i], { kind: "int" });
        else if (expected.kind === "bool") genExprWithExpectedType(node.args[i], { kind: "bool" });
        else if (expected.kind === "string") genExprWithExpectedType(node.args[i], { kind: "string" });
        else if (expected.kind === "struct") {
          const at = inferExprType(node.args[i]);
          if (at.kind !== "struct" || at.name !== expected.name) {
            cerror(`Cannot pass non-matching struct to parameter ${i}`, locOf(node.args[i]));
          }
          gen(node.args[i]);
          ir.emit("CLONE_STRUCT");
        } else if (expected.kind === "class") {
          const at = inferExprType(node.args[i]);
          if (at.kind !== "class" || at.name !== expected.name) {
            cerror(`Cannot pass non-matching class to parameter ${i}`, locOf(node.args[i]));
          }
          gen(node.args[i]);
        } else if (expected.kind === "ptr") {
          genExprWithExpectedType(node.args[i], expected);
        } else {
          gen(node.args[i]);
        }
      }

      ir.emit("CALL_METHOD", { className: base.name, methodName: node.methodName, argc: node.args.length });
      return;
    }

    // ---------- CAST ----------
    if (node instanceof AST.CastExpr) {
      const src = inferExprType(node.expr);
      const dst = typeFromName(node.targetType, locOf(node));
      // Only numeric casts are supported for now.
      if (dst.kind === "float" && src.kind === "int") {
        gen(node.expr);
        ir.emit("I2F");
        return;
      }
      if (dst.kind === "int" && src.kind === "float") {
        gen(node.expr);
        ir.emit("F2I");
        return;
      }
      // no-op (same type or unknown/opaque)
      gen(node.expr);
      return;
    }

    // ---------- INCREMENT ----------
    if (node instanceof AST.IncExpr) {
      // Currently supported lvalues: local variables.
      if (!(node.expr instanceof AST.VarExpr)) {
        cerror("++ currently supports only local variables", locOf(node));
      }
      const name = node.expr.name;

      if (node.kind === "post") {
        // old value remains on stack
        ir.emit("LOAD", name);
        ir.emit("LOAD", name);
        ir.emit("PUSH_CONST", 1);
        ir.emit("ADD");
        ir.emit("STORE", name);
        return;
      }

      // prefix
      ir.emit("LOAD", name);
      ir.emit("LOAD_CONST", 1);
      ir.emit("ADD");
      ir.emit("STORE", name);
      ir.emit("LOAD", name);
      return;
    }
    // ---------- UNARY ----------
    if (node instanceof AST.UnaryExpr) {
      const t = inferExprType(node.expr);

      if (node.op === "-") {
        if (!isNumeric(t)) cerror("Unary '-' expects numeric operand", locOf(node));
        gen(node.expr);
        ir.emit("NEG");
        return;
      }

      if (node.op === "!") {
        if (t.kind !== "bool") cerror("Unary '!' expects bool operand", locOf(node));
        gen(node.expr);
        ir.emit("NOT");
        return;
      }

      if (node.op === "&") {
        if (!(node.expr instanceof AST.VarExpr)) {
          cerror("'&' currently supports only local variables", locOf(node));
        }
        ir.emit("ADDR_VAR", node.expr.name);
        return;
      }

      if (node.op === "*") {
        // dereference: operand must evaluate to a pointer
        gen(node.expr);
        ir.emit("LOAD_PTR");
        return;
      }

      cerror("Unsupported unary op: " + node.op, locOf(node));
    }

    // ---------- BINARY ----------
    if (node instanceof AST.BinaryExpr) {
      const mapCmp = {
        "==": "EQ",
        "!=": "NE",
        "<": "LT",
        ">": "GT",
        "<=": "LE",
        ">=": "GE",
      };

      // Pointer arithmetic is supported for raw pointers (ptr +/- int, ptr - ptr).
      // We reuse ADD/SUB opcodes and let the VM handle pointer semantics.
      if (node.op === "+" || node.op === "-") {
        const lt = inferExprType(node.left);
        const rt = inferExprType(node.right);
        const isPtrAdd = node.op === "+" && ((isPtrType(lt) && rt.kind === "int") || (lt.kind === "int" && isPtrType(rt)));
        const isPtrSub = node.op === "-" && ((isPtrType(lt) && rt.kind === "int") || (isPtrType(lt) && isPtrType(rt)));
        if (isPtrAdd || isPtrSub) {
          gen(node.left);
          gen(node.right);
          ir.emit(node.op === "+" ? "ADD" : "SUB");
          return;
        }
      }

      if (node.op === "+") { genNumericBinary(node, null, "ADD"); return; }
      if (node.op === "-") { genNumericBinary(node, null, "SUB"); return; }
      if (node.op === "*") { genNumericBinary(node, null, "MUL"); return; }

      if (node.op === "/") {
        genNumericBinary(node, "IDIV", "DIV");
        return;
      }

      if (node.op === "%") {
        const lt = inferExprType(node.left);
        const rt = inferExprType(node.right);
        if (lt.kind !== "int" || rt.kind !== "int") cerror("Operator '%' expects int operands", locOf(node));
        gen(node.left);
        gen(node.right);
        ir.emit("MOD");
        return;
      }

      if (mapCmp[node.op]) {
        genComparison(node, mapCmp[node.op]);
        return;
      }

      if (node.op === "&&") {
        const lt = inferExprType(node.left);
        const rt = inferExprType(node.right);
        if (lt.kind !== "bool" || rt.kind !== "bool") cerror("Operator '&&' expects bool operands", locOf(node));
        gen(node.left);
        gen(node.right);
        ir.emit("AND");
        return;
      }

      if (node.op === "||") {
        const lt = inferExprType(node.left);
        const rt = inferExprType(node.right);
        if (lt.kind !== "bool" || rt.kind !== "bool") cerror("Operator '||' expects bool operands", locOf(node));
        gen(node.left);
        gen(node.right);
        ir.emit("OR");
        return;
      }

      if (node.op === "<<") {
        // Stream-style output: lower left-associative `<<` chains to PRINT_INLINE.
        // We do this unconditionally because this project doesn't implement bit-shifts.
        function baseName(expr) {
          let e = expr;
          while (e instanceof AST.BinaryExpr && e.op === "<<") e = e.left;
          if (e instanceof AST.VarExpr) {
            const n = e.name.split("::").pop();
            return n;
          }
          return null;
        }
        // Flatten left-associative chain: (((cout<<a)<<b)<<c)
        function collect(expr, out) {
          if (expr instanceof AST.BinaryExpr && expr.op === "<<") {
            collect(expr.left, out);
            out.push(expr.right);
            return;
          }
        }
        const items = [];
        collect(node, items);
        for (const it of items) {
          gen(it);
          ir.emit("PRINT_INLINE");
        }
        // expression result (stream) is unused in ExprStmt; push a dummy
        ir.emit("PUSH_CONST", 0);
        return;
      }

      cerror("Unsupported binary op: " + node.op, locOf(node));
    }

    // ---------- PRINT ----------
    if (node instanceof AST.PrintStmt) {
      const args = node.args || [];
      if (args.length === 0) {
        ir.emit("PUSH_CONST", "");
        ir.emit("PRINT");
        return;
      }

      for (let i = 0; i < args.length; i++) {
        const isLast = i === args.length - 1;
        gen(args[i]);

        if (!isLast) {
          ir.emit("PRINT_INLINE");
          ir.emit("PUSH_CONST", " ");
          ir.emit("PRINT_INLINE");
        } else {
          ir.emit("PRINT");
        }
      }
      return;
    }

    // ---------- FUNCTION CALL / METHOD CALL ----------
    if (node instanceof AST.CallExpr) {
      // v0.7 legacy: CallExpr with node.name (string)
      if (typeof node.name === "string") {
        const sig = funcSigs.get(node.name);
        if (!sig) cerror(`Unknown function '${node.name}'`, locOf(node));
        if (node.args.length !== sig.params.length) {
          cerror(`Function '${node.name}' expects ${sig.params.length} args, got ${node.args.length}`, locOf(node));
        }

        for (let i = 0; i < node.args.length; i++) {
          const expected = sig.params[i] || { kind: "unknown" };
          if (expected.kind === "ref") {
            genRefArg(node.args[i], expected);
          } else if (expected.kind === "float") genExprWithExpectedType(node.args[i], { kind: "float" });
          else if (expected.kind === "int") genExprWithExpectedType(node.args[i], { kind: "int" });
          else if (expected.kind === "bool") genExprWithExpectedType(node.args[i], { kind: "bool" });
          else if (expected.kind === "string") genExprWithExpectedType(node.args[i], { kind: "string" });
          else if (expected.kind === "struct") {
            const at = inferExprType(node.args[i]);
            if (at.kind !== "struct" || at.name !== expected.name) {
              cerror(`Cannot pass non-matching struct to parameter ${i}`, locOf(node.args[i]));
            }
            gen(node.args[i]);
            ir.emit("CLONE_STRUCT");
          } else if (expected.kind === "class") {
            const at = inferExprType(node.args[i]);
            if (at.kind !== "class" || at.name !== expected.name) {
              cerror(`Cannot pass non-matching class to parameter ${i}`, locOf(node.args[i]));
            }
            gen(node.args[i]);
          } else if (expected.kind === "ptr") {
            genExprWithExpectedType(node.args[i], expected);
          } else {
            gen(node.args[i]);
          }
        }

        ir.emit("CALL", { name: node.name, argc: node.args.length });
        return;
      }

      // v0.8-style: CallExpr(calleeExpr, args)
      const callee = node.callee;

      // foo(...)
      if (callee instanceof AST.VarExpr) {
        const fname = callee.name;
        const sig = funcSigs.get(fname);
        if (!sig) {
          if (BUILTINS.has(fname)) {
            // builtins are validated via inferExprType; just emit args and a CALL.
            for (let i = 0; i < node.args.length; i++) {
              gen(node.args[i]);
            }
            ir.emit("CALL", { name: fname, argc: node.args.length });
            return;
          }
          
          // If it's a variable of function-pointer type, emit an indirect call.
          const vty = varTypes.get(fname);
          if (vty && vty.kind === "fnptr") {
            // args...
            for (let i = 0; i < node.args.length; i++) {
              const expected = vty.params[i] || { kind: "unknown" };
              if (expected.kind === "ref") genRefArg(node.args[i], expected);
              else if (expected.kind === "float") genExprWithExpectedType(node.args[i], { kind: "float" });
              else if (expected.kind === "int") genExprWithExpectedType(node.args[i], { kind: "int" });
              else if (expected.kind === "bool") genExprWithExpectedType(node.args[i], { kind: "bool" });
              else if (expected.kind === "string") genExprWithExpectedType(node.args[i], { kind: "string" });
              else if (expected.kind === "ptr") genExprWithExpectedType(node.args[i], expected);
              else if (expected.kind === "fnptr") genExprWithExpectedType(node.args[i], expected);
              else gen(node.args[i]);
            }
            ir.emit("LOAD_VAR", fname);
            ir.emit("CALL_INDIRECT", node.args.length);
            return;
          }
cerror(`Unknown function '${fname}'`, locOf(node));
        }
        if (node.args.length !== sig.params.length) {
          cerror(`Function '${fname}' expects ${sig.params.length} args, got ${node.args.length}`, locOf(node));
        }

        for (let i = 0; i < node.args.length; i++) {
          const expected = sig.params[i] || { kind: "unknown" };
          if (expected.kind === "ref") {
            genRefArg(node.args[i], expected);
          } else if (expected.kind === "float") genExprWithExpectedType(node.args[i], { kind: "float" });
          else if (expected.kind === "int") genExprWithExpectedType(node.args[i], { kind: "int" });
          else if (expected.kind === "bool") genExprWithExpectedType(node.args[i], { kind: "bool" });
          else if (expected.kind === "string") genExprWithExpectedType(node.args[i], { kind: "string" });
          else if (expected.kind === "struct") {
            const at = inferExprType(node.args[i]);
            if (at.kind !== "struct" || at.name !== expected.name) {
              cerror(`Cannot pass non-matching struct to parameter ${i}`, locOf(node.args[i]));
            }
            gen(node.args[i]);
            ir.emit("CLONE_STRUCT");
          } else if (expected.kind === "class") {
            const at = inferExprType(node.args[i]);
            if (at.kind !== "class" || at.name !== expected.name) {
              cerror(`Cannot pass non-matching class to parameter ${i}`, locOf(node.args[i]));
            }
            gen(node.args[i]);
          } else if (expected.kind === "ptr") {
            genExprWithExpectedType(node.args[i], expected);
          } else {
            gen(node.args[i]);
          }
        }

        ir.emit("CALL", { name: fname, argc: node.args.length });
        return;
      }

      // obj.method(...)
      if (callee instanceof AST.FieldAccessExpr) {
        const tmp = new AST.MethodCallExpr(callee.base, callee.field, node.args, locOf(node));
        gen(tmp);
        return;
      }

      // ptr->method(...)
      if (callee instanceof AST.PtrFieldAccessExpr) {
        const tmp = new AST.PtrMethodCallExpr(callee.basePtr, callee.field, node.args, locOf(node));
        gen(tmp);
        return;
      }

      cerror("Unsupported call callee", locOf(node));
    }



    // ---------- IF ----------
    if (node instanceof AST.IfStmt) {
      genExprWithExpectedType(node.cond, { kind: "bool" });
      const jf = ir.emit("JUMP_IF_FALSE", null);

      for (const s of node.thenBody) gen(s);

      if (node.elseBody && node.elseBody.length > 0) {
        const jend = ir.emit("JUMP", null);
        ir.patch(jf, ir.instructions.length);

        for (const s of node.elseBody) gen(s);

        ir.patch(jend, ir.instructions.length);
      } else {
        ir.patch(jf, ir.instructions.length);
      }
      return;
    }

    // ---------- WHILE ----------
    if (node instanceof AST.WhileStmt) {
      const start = ir.instructions.length;
      genExprWithExpectedType(node.cond, { kind: "bool" });
      const jf = ir.emit("JUMP_IF_FALSE", null);

      for (const s of node.body) gen(s);

      ir.emit("JUMP", start);
      ir.patch(jf, ir.instructions.length);
      return;
    }

    // ---------- FOR ----------
    if (node instanceof AST.ForStmt) {
      // init
      if (node.init) gen(node.init);

      const start = ir.instructions.length;
      if (node.cond) {
        genExprWithExpectedType(node.cond, { kind: "bool" });
      } else {
        ir.emit("PUSH_CONST", true);
      }
      const jf = ir.emit("JUMP_IF_FALSE", null);

      for (const s of node.body) gen(s);

      if (node.post) {
        gen(node.post);
        ir.emit("POP");
      }

      ir.emit("JUMP", start);
      ir.patch(jf, ir.instructions.length);
      return;
    }

    // ---------- RETURN ----------
    if (node instanceof AST.ReturnStmt) {
      // main: halt program
      if (!inFunction || currentFuncName === "main") {
        if (node.expr) gen(node.expr);
        ir.emit("HALT");
        return;
      }

      if (currentFuncRetType.kind === "void") {
        if (node.expr) cerror(`Function '${currentFuncName}' is void; cannot return a value`, locOf(node));
        ir.emit("RETURN");
        return;
      }

      if (!node.expr) cerror(`Function '${currentFuncName}' must return a value`, locOf(node));

      if (currentFuncRetType.kind === "float") genExprWithExpectedType(node.expr, { kind: "float" });
      else if (currentFuncRetType.kind === "int") genExprWithExpectedType(node.expr, { kind: "int" });
      else if (currentFuncRetType.kind === "bool") genExprWithExpectedType(node.expr, { kind: "bool" });
      else if (currentFuncRetType.kind === "string") genExprWithExpectedType(node.expr, { kind: "string" });
      else if (currentFuncRetType.kind === "struct") {
        const t = inferExprType(node.expr);
        if (t.kind !== "struct" || t.name !== currentFuncRetType.name) {
          cerror(`Return type mismatch in function '${currentFuncName}'`, locOf(node.expr));
        }
        gen(node.expr);
        ir.emit("CLONE_STRUCT");
      } else if (currentFuncRetType.kind === "class") {
        const t = inferExprType(node.expr);
        if (t.kind !== "class" || t.name !== currentFuncRetType.name) {
          cerror(`Return type mismatch in function '${currentFuncName}'`, locOf(node.expr));
        }
        gen(node.expr); // reference
      } else if (currentFuncRetType.kind === "ptr") {
        genExprWithExpectedType(node.expr, currentFuncRetType);
      } else {
        gen(node.expr);
      }

      ir.emit("RETURN_VAL");
      return;
    }

    cerror("Unknown AST node in IR gen: " + node.constructor.name, locOf(node));
  }

  // ---------------------------------------------------------
  // Emit DEF_METHOD registrations BEFORE main executes
  // Register all classes (even if they have no methods) so VM knows about them
  // ---------------------------------------------------------
  const registeredClasses = new Set();
  for (const cd of classes) {
    let hasAnyMethod = false;
    for (const m of cd.methods || []) {
      if (m.body === null) {
        // Runtime-provided method - still register the class
        hasAnyMethod = true;
        continue;
      }
      // Skip stream operators - they're handled specially as binary operators
      if ((m.name === "operator<<" && (cd.name === "ostream" || cd.name === "std::ostream")) ||
          (m.name === "operator>>" && (cd.name === "istream" || cd.name === "std::istream"))) {
        continue;
      }
      ir.emit("DEF_METHOD", {
        className: cd.name,
        methodName: m.name,
        funcName: mangleMethodName(cd.name, m.name),
      });
      registeredClasses.add(cd.name);
      hasAnyMethod = true;
    }
    // Register classes with no methods or only runtime methods (template classes)
    // Register all runtime methods so VM knows they exist
    if (!registeredClasses.has(cd.name)) {
      for (const m of cd.methods || []) {
        if (m.body === null) {
          // Register runtime-provided methods with special marker
          ir.emit("DEF_METHOD", {
            className: cd.name,
            methodName: m.name,
            funcName: "__RUNTIME__", // Special marker for runtime-provided methods
          });
        }
      }
      // If class has no methods at all, register with a dummy to ensure class exists
      if ((cd.methods || []).length === 0) {
        ir.emit("DEF_METHOD", {
          className: cd.name,
          methodName: "__dummy__",
          funcName: "__RUNTIME__",
        });
      }
      registeredClasses.add(cd.name);
    }
  }

  // ---------------------------------------------------------
  // PASS A: emit main as top-level code
  // ---------------------------------------------------------
  inFunction = false;
  inMethod = false;
  currentClassName = null;
  currentThisType = null;

  currentFuncName = "main";
  currentFuncRetType = typeFromName(mainFunc.returnType || "int");
  varTypes = new Map();

  for (const stmt of mainFunc.body) gen(stmt);
  ir.emit("HALT"); // safety

  // ---------------------------------------------------------
  // PASS B: emit other free functions
  // ---------------------------------------------------------
  inFunction = true;
  for (const f of otherFuncs) {
    inMethod = false;
    currentClassName = null;
    currentThisType = null;

    currentFuncName = f.name;
    currentFuncRetType = typeFromName(f.returnType || "int");
    varTypes = new Map();

    ir.emit("FUNC_LABEL", f.name);

    for (let i = 0; i < f.params.length; i++) {
      const p = f.params[i];
      const pName = p.name;
      const pType = typeFromName(p.typeName);

      ir.emit("LOAD", `$arg${i}`);
      ir.emit("STORE", pName);
      varTypes.set(pName, pType);
    }

    for (const stmt of f.body) gen(stmt);

    ir.emit("RETURN");
  }

  // ---------------------------------------------------------
  // PASS C: emit class methods as mangled functions
  // Convention:
  //   $arg0 = receiver (this)
  //   $arg1.. = explicit args
  // ---------------------------------------------------------
  for (const cd of classes) {
    for (const m of cd.methods || []) {
      if (m.body === null) continue; // declaration-only stub
      // Skip stream operators - they're handled specially as binary operators
      if ((m.name === "operator<<" && (cd.name === "ostream" || cd.name === "std::ostream")) ||
          (m.name === "operator>>" && (cd.name === "istream" || cd.name === "std::istream"))) {
        continue;
      }
      inMethod = true;
      currentClassName = cd.name;
      currentThisType = { kind: "class", name: cd.name };

      const mangled = mangleMethodName(cd.name, m.name);
      currentFuncName = mangled;
      currentFuncRetType = typeFromName(m.returnType || "void");
      varTypes = new Map();

      ir.emit("FUNC_LABEL", mangled);

      // bind this
      ir.emit("LOAD", "$arg0");
      ir.emit("STORE", "$this");
      varTypes.set("$this", currentThisType);

      // bind params
      for (let i = 0; i < (m.params || []).length; i++) {
        const p = m.params[i];
        const pName = p.name;
        const pType = typeFromName(p.typeName);

        ir.emit("LOAD", `$arg${i + 1}`);
        ir.emit("STORE", pName);
        varTypes.set(pName, pType);
      }

      for (const stmt of m.body) gen(stmt);

      ir.emit("RETURN");
    }
  }

  // ---------------------------------------------------------
  // PASS D: emit class destructors as mangled functions
  // Convention: $arg0 = receiver (this)
  // Called by VM during delete as: most-derived -> base chain
  // ---------------------------------------------------------
  for (const cd of classes) {
    const dtorDecls = (cd.destructors || []);
    if (dtorDecls.length !== 1) continue;
    const dtor = dtorDecls[0];

    if (dtor.body === null) continue; // declaration-only stub

    inMethod = true;
    currentClassName = cd.name;
    currentThisType = { kind: 'class', name: cd.name };

    const mangled = mangleDtorName(cd.name);
    currentFuncName = mangled;
    currentFuncRetType = { kind: 'void' };
    varTypes = new Map();

    ir.emit('FUNC_LABEL', mangled);

    // bind this
    ir.emit('LOAD', '$arg0');
    ir.emit('STORE', '$this');
    varTypes.set('$this', currentThisType);

    inDestructor = true;
    for (const stmt of (dtor.body || [])) gen(stmt);
    inDestructor = false;

    ir.emit('RETURN');
  }

  // ---------------------------------------------------------

  return ir;
}


module.exports = generateIR;