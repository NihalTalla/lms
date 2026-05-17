// cpp/templates.js
// v1.0: frontend-only templates (monomorphization)
//
// Scope (by design, matches roadmap):
// - Function templates only: template <typename T, ...> <functionDecl>
// - No VM changes; we rewrite template calls into calls to synthesized concrete functions.
// - Type parameters are substituted purely in surface type strings ("T", "T*", "const T&", ...).
// - Basic inference supported for the common case of 1 type parameter and simple arg types.

const AST = require("./ast");
const { CompileError } = require("./errors");

function locOf(node) {
  return node && node.loc ? node.loc : null;
}

function mangleType(t) {
  // Deterministic and collision-resistant enough for v1.0.
  return String(t)
    .replace(/\s+/g, "_")
    .replace(/\*/g, "ptr")
    .replace(/&/g, "ref")
    .replace(/::/g, "__")
    .replace(/[^A-Za-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mangleName(base, typeArgs) {
  return `${base}__${typeArgs.map(mangleType).join("__")}`;
}

function cloneAst(node) {
  if (node === null || node === undefined) return node;
  if (typeof node !== "object") return node;
  if (Array.isArray(node)) return node.map(cloneAst);

  // Preserve prototypes so instanceof checks keep working.
  const copy = Object.create(Object.getPrototypeOf(node));
  for (const k of Object.keys(node)) {
    copy[k] = cloneAst(node[k]);
  }
  return copy;
}

function replaceTypeVars(typeStr, subst) {
  if (typeof typeStr !== "string") return typeStr;
  let out = typeStr;
  for (const [tp, actual] of Object.entries(subst)) {
    const re = new RegExp(`\\b${tp}\\b`, "g");
    out = out.replace(re, actual);
  }
  return out;
}

function substituteTypesInTree(node, subst) {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const el of node) substituteTypesInTree(el, subst);
    return;
  }
  if (typeof node !== "object") return;

  // Replace in known type-carrying fields.
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (typeof v === "string") {
      // Only replace in fields that are clearly types.
      if (
        k === "typeName" ||
        k === "returnType" ||
        k === "castType" ||
        k === "allocType" ||
        k === "targetType"
      ) {
        node[k] = replaceTypeVars(v, subst);
      }
    } else {
      substituteTypesInTree(v, subst);
    }
  }
}

// --- Basic type inference for template calls ---
// This is intentionally conservative to avoid changing semantics.
// Supports:
// - single type param templates: template <typename T>
// - inference from: literals, VarExpr referring to params/locals, 'this' not supported
function buildLocalTypeEnv(funcDecl) {
  const env = new Map();
  for (const p of funcDecl.params || []) {
    env.set(p.name, p.typeName);
  }
  function walkStmt(s) {
    if (!s || typeof s !== "object") return;
    if (s instanceof AST.VarDecl) {
      env.set(s.name, s.typeName);
    }
    // Recurse into nested blocks/try-catch etc.
    for (const k of Object.keys(s)) {
      const v = s[k];
      if (Array.isArray(v)) v.forEach(walkStmt);
      else if (v && typeof v === "object") walkStmt(v);
    }
  }
  (funcDecl.body || []).forEach(walkStmt);
  return env;
}

function inferExprTypeShallow(expr, env) {
  if (!expr || typeof expr !== "object") return null;
  if (expr instanceof AST.IntLiteral) return "int";
  if (expr instanceof AST.FloatLiteral) return "float";
  if (expr instanceof AST.BoolLiteral) return "bool";
  if (expr instanceof AST.StringLiteral) return "string";
  if (expr instanceof AST.NullLiteral) return "null"; // cannot infer a concrete T
  if (expr instanceof AST.VarExpr) return env.get(expr.name) || null;
  // Very small extension: unary/binary propagate if both sides agree
  if (expr instanceof AST.UnaryExpr) return inferExprTypeShallow(expr.expr, env);
  if (expr instanceof AST.BinaryExpr) {
    const lt = inferExprTypeShallow(expr.left, env);
    const rt = inferExprTypeShallow(expr.right, env);
    if (lt && rt && lt === rt) return lt;
    return null;
  }
  return null;
}


function parseTemplateTypeString(typeStr) {
  if (typeof typeStr !== "string") return null;
  let s = typeStr.trim();

  // Preserve leading const
  let constPrefix = "";
  if (s.startsWith("const ")) {
    constPrefix = "const ";
    s = s.slice(6).trim();
  }

  const lt = s.indexOf("<");
  if (lt < 0) return null;

  // Find matching >
  let depth = 0;
  let gt = -1;
  for (let i = lt; i < s.length; i++) {
    const ch = s[i];
    if (ch === "<") depth++;
    else if (ch === ">") {
      depth--;
      if (depth === 0) {
        gt = i;
        break;
      }
    }
  }
  if (gt < 0) return null;

  const base = s.slice(0, lt).trim();
  const inside = s.slice(lt + 1, gt).trim();
  const suffix = s.slice(gt + 1).trim(); // may contain *, &, etc.

  // split args by comma at depth 0
  const args = [];
  let cur = "";
  depth = 0;
  for (let i = 0; i < inside.length; i++) {
    const ch = inside[i];
    if (ch === "<") { depth++; cur += ch; continue; }
    if (ch === ">") { depth--; cur += ch; continue; }
    if (ch === "," && depth === 0) {
      args.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim().length) args.push(cur.trim());

  return { constPrefix, base, args, suffix };
}

function mangleTemplateInstanceName(base, args) {
  return `${base}__${args.map(mangleType).join("__")}`;
}

// Replace template-id occurrences inside a type string with their instantiated names.
// Only handles one top-level template-id at the beginning of the (non-const) type.
function rewriteTypeString(typeStr, instNameMap) {
  const parsed = parseTemplateTypeString(typeStr);
  if (!parsed) return typeStr;
  const key = `${parsed.base}<${parsed.args.join(",")}>`;
  const inst = instNameMap.get(key);
  if (!inst) return typeStr;
  const out = `${parsed.constPrefix}${inst}${parsed.suffix ? " " + parsed.suffix : ""}`.trim();
  // compact spaces before * or &
  return out.replace(/\s+([*&])/g, "$1");
}

function substituteValueNamesInExpr(expr, subst) {
  if (!expr || typeof expr !== "object") return;
  if (Array.isArray(expr)) {
    expr.forEach((e) => substituteValueNamesInExpr(e, subst));
    return;
  }
  // replace simple VarExpr names
  if (expr instanceof AST.VarExpr) {
    if (Object.prototype.hasOwnProperty.call(subst, expr.name)) {
      // Turn into a literal if it looks like one, otherwise keep as VarExpr.
      const v = subst[expr.name];
      if (v === "true" || v === "false") {
        return new AST.BoolLiteral(v === "true", expr.loc || null);
      }
      if (/^-?\d+$/.test(v)) {
        return new AST.IntLiteral(parseInt(v, 10), expr.loc || null);
      }
      expr.name = v;
    }
  }
  for (const k of Object.keys(expr)) {
    const v = expr[k];
    if (v && typeof v === "object") {
      const replaced = substituteValueNamesInExpr(v, subst);
      if (replaced) expr[k] = replaced;
    }
  }
}

// Walk the whole tree and rewrite type-carrying fields using instNameMap.
function rewriteTypesInTree(node, instNameMap) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    node.forEach((n) => rewriteTypesInTree(n, instNameMap));
    return;
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (typeof v === "string") {
      if (
        k === "typeName" ||
        k === "returnType" ||
        k === "castType" ||
        k === "allocType" ||
        k === "targetType"
      ) {
        node[k] = rewriteTypeString(v, instNameMap);
      }
    } else if (v && typeof v === "object") {
      rewriteTypesInTree(v, instNameMap);
    }
  }
}

// Collect template-id type strings used anywhere in the program.
function collectTemplateTypes(program) {
  const used = new Set();

  function collectFromType(t) {
    const p = parseTemplateTypeString(t);
    if (!p) return;
    used.add(`${p.base}<${p.args.join(",")}>`);
    // also recurse into arg types
    for (const a of p.args) collectFromType(a);
  }

  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (typeof v === "string") {
        if (
          k === "typeName" ||
          k === "returnType" ||
          k === "castType" ||
          k === "allocType" ||
          k === "targetType"
        ) {
          collectFromType(v);
        }
      } else if (v && typeof v === "object") walk(v);
    }
  }

  // decl signatures + bodies
  (program.structs || []).forEach(walk);
  (program.classes || []).forEach(walk);
  (program.funcs || []).forEach(walk);

  return used;
}

function expandTemplates(program) {
  // --- Collect template function decls (existing behavior) ---
  const templatesFn = new Map();
  const concreteFuncs = [];
  const otherFuncs = [];

  for (const f of program.funcs || []) {
    if (f instanceof AST.TemplateFunctionDecl) {
      const name = f.funcDecl.name;
      if (templatesFn.has(name)) {
        throw new CompileError(`Duplicate template function '${name}'`, locOf(f));
      }
      templatesFn.set(name, f);
    } else {
      otherFuncs.push(f);
    }
  }

  const instFnCache = new Map();

  function ensureFnInstantiated(templateName, typeArgs, callLoc) {
    for (const t of typeArgs) {
      if (typeof t !== "string") {
        throw new CompileError(`Invalid template type argument for '${templateName}'`, callLoc);
      }
    }
    const key = `${templateName}|${typeArgs.join(",")}`;
    if (instFnCache.has(key)) return instFnCache.get(key);

    const tdecl = templatesFn.get(templateName);
    if (!tdecl) {
      throw new CompileError(`Unknown template function '${templateName}'`, callLoc);
    }
    if (typeArgs.length !== tdecl.typeParams.length) {
      throw new CompileError(
        `Template '${templateName}' expects ${tdecl.typeParams.length} type argument(s), got ${typeArgs.length}`,
        callLoc
      );
    }

    const subst = {};
    for (let i = 0; i < tdecl.typeParams.length; i++) {
      subst[tdecl.typeParams[i]] = typeArgs[i];
    }

    const fn = cloneAst(tdecl.funcDecl);
    fn.name = mangleName(templateName, typeArgs);
    fn.returnType = replaceTypeVars(fn.returnType, subst);
    for (const p of fn.params || []) {
      p.typeName = replaceTypeVars(p.typeName, subst);
    }
    substituteTypesInTree(fn, subst);

    concreteFuncs.push(fn);
    instFnCache.set(key, fn.name);
    return fn.name;
  }

  function rewriteInFunction(funcDecl) {
    const env = buildLocalTypeEnv(funcDecl);

    function rewriteExpr(expr) {
      if (!expr || typeof expr !== "object") return expr;
      if (expr instanceof AST.TemplateCallExpr) {
        const base = expr.callee;
        if (!(base instanceof AST.VarExpr)) {
          throw new CompileError("Template calls only supported for free functions", locOf(expr));
        }
        const tname = base.name;

        let typeArgs = expr.typeArgs || [];
        if (!typeArgs || typeArgs.length === 0) {
          // inference (single type param)
          const tdecl = templatesFn.get(tname);
          if (!tdecl || tdecl.typeParams.length !== 1) {
            throw new CompileError(`Cannot infer template arguments for '${tname}'`, locOf(expr));
          }
          // infer from first argument
          if (!expr.args || expr.args.length === 0) {
            throw new CompileError(`Cannot infer template arguments for '${tname}' with no args`, locOf(expr));
          }
          const a0 = inferExprTypeShallow(expr.args[0], env);
          if (!a0) {
            throw new CompileError(`Cannot infer template argument for '${tname}'`, locOf(expr));
          }
          typeArgs = [a0];
        }

        const instName = ensureFnInstantiated(tname, typeArgs, locOf(expr));
        return new AST.CallExpr(new AST.VarExpr(instName, locOf(base)), expr.args.map(rewriteExpr), locOf(expr));
      }

      for (const k of Object.keys(expr)) {
        const v = expr[k];
        if (Array.isArray(v)) expr[k] = v.map(rewriteExpr);
        else if (v && typeof v === "object") expr[k] = rewriteExpr(v);
      }
      return expr;
    }

    function rewriteStmt(stmt) {
      if (!stmt || typeof stmt !== "object") return;
      for (const k of Object.keys(stmt)) {
        const v = stmt[k];
        if (Array.isArray(v)) v.forEach(rewriteStmt);
        else if (v && typeof v === "object") rewriteStmt(v);
      }
      // rewrite expression fields
      for (const k of Object.keys(stmt)) {
        const v = stmt[k];
        if (v && typeof v === "object") stmt[k] = rewriteExpr(v);
        if (Array.isArray(v)) stmt[k] = v.map((x) => (typeof x === "object" ? rewriteExpr(x) : x));
      }
    }

    (funcDecl.body || []).forEach(rewriteStmt);
  }

  for (const f of otherFuncs) rewriteInFunction(f);
  for (const f of concreteFuncs) rewriteInFunction(f);

  // --- NEW: template class/struct monomorphization (Option A minimal) ---
  const templateClasses = new Map(); // baseName -> TemplateClassDecl
  const templateStructs = new Map(); // baseName -> TemplateStructDecl

  const plainClasses = [];
  const plainStructs = [];

  // Also normalize already-specialized names like "is_integral<int>" into mangled instances.
  const instNameMap = new Map(); // key "base<args>" -> instName

  function recordSpecializedName(kind, decl) {
    if (!decl || !decl.name || decl.name.indexOf("<") < 0) return decl;
    const parsed = parseTemplateTypeString(decl.name);
    if (!parsed) return decl;
    const key = `${parsed.base}<${parsed.args.join(",")}>`;
    const inst = mangleTemplateInstanceName(parsed.base.replace(/::/g, "__"), parsed.args);
    instNameMap.set(key, inst);
    const cloned = cloneAst(decl);
    cloned.name = inst;
    return cloned;
  }

  for (const c of program.classes || []) {
    if (c instanceof AST.TemplateClassDecl) {
      const base = c.classDecl.name;
      templateClasses.set(base, c);
    } else if (c instanceof AST.ClassDecl) {
      plainClasses.push(recordSpecializedName("class", c));
    } else {
      // ignore unknown
    }
  }
  for (const sd of program.structs || []) {
    if (sd instanceof AST.TemplateStructDecl) {
      const base = sd.structDecl.name;
      templateStructs.set(base, sd);
    } else if (sd instanceof AST.StructDecl) {
      plainStructs.push(recordSpecializedName("struct", sd));
    } else {
      // ignore
    }
  }

  function instantiateTemplateAggregate(base, args) {
    const key = `${base}<${args.join(",")}>`;
    if (instNameMap.has(key)) return instNameMap.get(key);

    const tcd = templateClasses.get(base);
    const tsd = templateStructs.get(base);
    if (!tcd && !tsd) return null;

    const typeParams = (tcd ? tcd.typeParams : tsd.typeParams) || [];
    const subst = {};
    for (let i = 0; i < typeParams.length && i < args.length; i++) {
      subst[typeParams[i]] = args[i];
    }

    const instBase = base.replace(/::/g, "__");
    const instName = mangleTemplateInstanceName(instBase, args);

    if (tcd) {
      const cd = cloneAst(tcd.classDecl);
      cd.name = instName;
      cd.baseName = replaceTypeVars(cd.baseName || "", subst) || cd.baseName;
      // Substitute types within class
      for (const f of cd.fields || []) f.typeName = replaceTypeVars(f.typeName, subst);
      for (const m of cd.methods || []) {
        m.returnType = replaceTypeVars(m.returnType, subst);
        for (const p of m.params || []) p.typeName = replaceTypeVars(p.typeName, subst);
        substituteTypesInTree(m, subst);
      }
      plainClasses.push(cd);
    } else if (tsd) {
      const sd2 = cloneAst(tsd.structDecl);
      sd2.name = instName;
      for (const f of sd2.fields || []) f.typeName = replaceTypeVars(f.typeName, subst);
      plainStructs.push(sd2);
    }

    instNameMap.set(key, instName);
    return instName;
  }

  // Fixed-point: collect used template types and instantiate as needed.
  let changed = true;
  while (changed) {
    changed = false;
    const used = collectTemplateTypes(new AST.Program(plainStructs, plainClasses, otherFuncs.concat(concreteFuncs), [], program.loc));
    for (const key of used) {
      const m = /^(.+?)<(.*)>$/.exec(key);
      if (!m) continue;
      const base = m[1];
      const args = m[2].length ? m[2].split(",").map((x) => x.trim()) : [];
      // only instantiate if we have the template decl
      if ((templateClasses.has(base) || templateStructs.has(base)) && !instNameMap.has(key)) {
        const inst = instantiateTemplateAggregate(base, args);
        if (inst) changed = true;
      }
    }
  }

  // Rewrite all type strings to refer to instantiated concrete names.
  const finalProg = new AST.Program(plainStructs, plainClasses, otherFuncs.concat(concreteFuncs), [], program.loc || null);
  rewriteTypesInTree(finalProg, instNameMap);

  return finalProg;
}
module.exports = {
  expandTemplates,
};
