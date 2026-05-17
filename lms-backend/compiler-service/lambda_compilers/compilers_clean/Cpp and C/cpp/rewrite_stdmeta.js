// cpp/rewrite_stdmeta.js
// Minimal compile-time rewrites for common std meta-programming stubs.
// Currently supports: is_same<A,B>::value -> true/false

const AST = require('./ast');

function normalizeTypeString(s) {
  return String(s)
    .replace(/\s+/g, '')
    .replace(/\bunsignedint\b/g, 'unsigned')
    .replace(/\blongint\b/g, 'long')
    .replace(/\bshortint\b/g, 'short');
}

function rewriteIsSameVar(name) {

  // Matches: is_same<...,...>::value (allow spaces)
  const m = /^is_same<(.+)>::value$/.exec(name);
  if (!m) return null;
  const inside = m[1];

  // Split on top-level comma (no nesting depth handling needed for our std stubs)
  let depth = 0;
  let splitAt = -1;
  for (let i = 0; i < inside.length; i++) {
    const ch = inside[i];
    if (ch === '<') depth++;
    else if (ch === '>') depth = Math.max(0, depth - 1);
    else if (ch === ',' && depth === 0) { splitAt = i; break; }
  }
  if (splitAt < 0) return null;

  const a = inside.slice(0, splitAt).trim();
  const b = inside.slice(splitAt + 1).trim();

  const eq = normalizeTypeString(a) === normalizeTypeString(b);
  return eq;
}


function rewriteNumericLimitsCall(calleeName) {
  // Matches: numeric_limits<T>::min / max / lowest
  const m = /^numeric_limits<(.+)>::(min|max|lowest)$/.exec(calleeName);
  if (!m) return null;
  const t = normalizeTypeString(m[1]);
  const which = m[2];

  // Assumptions for this compiler runtime:
  // - int is 32-bit signed
  // - unsigned is 32-bit unsigned
  // - char is 8-bit signed (we treat as signed for limits)
  // Keep this minimal: only handle the cases used in the std stubs + tests.
  const limits = {
    'int': { min: -2147483648, max: 2147483647, lowest: -2147483648 },
    'unsigned': { min: 0, max: 4294967295, lowest: 0 },
    'unsignedint': { min: 0, max: 4294967295, lowest: 0 },
    'char': { min: -128, max: 127, lowest: -128 },
    'unsignedchar': { min: 0, max: 255, lowest: 0 },
  };

  const entry = limits[t];
  if (!entry) return null;
  return entry[which];
}

function transform(node) {
  if (!node || typeof node !== 'object') return node;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = transform(node[i]);
    return node;
  }

  if (node instanceof AST.VarExpr) {
    const eq = rewriteIsSameVar(node.name);
    if (eq !== null) {
      // Use bool literal; stream printing will print 0/1 via our IO lowering.
      return new AST.BoolLiteral(eq, node.loc);
    }
    return node;
  }

  if (node instanceof AST.CallExpr) {
    // numeric_limits<T>::min()/max()/lowest() -> integer literal
    if (node.callee instanceof AST.VarExpr && node.args && node.args.length === 0) {
      const v = rewriteNumericLimitsCall(node.callee.name);
      if (v !== null) {
        if (v < 0) return new AST.UnaryExpr('-', new AST.IntLiteral(Math.abs(v), node.loc), node.loc);
        return new AST.IntLiteral(v, node.loc);
      }
    }
    return node;
  }

  // Recurse through object fields
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (v && typeof v === 'object') {
      node[k] = transform(v);
    }
  }

  return node;
}

function rewriteStdMeta(programAst) {
  return transform(programAst);
}

module.exports = { rewriteStdMeta };
