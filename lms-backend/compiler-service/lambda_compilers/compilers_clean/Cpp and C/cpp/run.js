// cpp/run.js
const fs = require("fs");
const path = require("path");

const lex = require("./lexer");
const Parser = require("./parser");
const { flattenNamespaces } = require("./namespaces");
const { expandTemplates } = require("./templates");
const { rewriteStdMeta } = require("./rewrite_stdmeta");
const generateIR = require("./irgen");
const lowerIR = require("../ir/ir_lower");
const VM = require("../vm/vm");

// --------------------
// CLI handling
// --------------------
const argv = process.argv.slice(2);

let srcPath = argv[0] || path.join(__dirname, "..", "test", "test.cpp");

const includePaths = [];
let stdRoot = path.join(__dirname, "..", "cpp", "stdlib");
let injectStd = true;

for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--I" && argv[i + 1]) {
    includePaths.push(path.resolve(argv[++i]));
    continue;
  }
  if (a === "--std" && argv[i + 1]) {
    stdRoot = path.resolve(argv[++i]);
    continue;
  }
  if (a === "--no-std") {
    injectStd = false;
    continue;
  }
}

srcPath = path.resolve(srcPath);

// --------------------
// Utilities
// --------------------
function stripBOM(s) {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

// --------------------
// Module resolution
// --------------------
function resolveImport(moduleName, fromDir) {
  const parts = moduleName.split(".");
  const rel = parts.join(path.sep) + ".cpp";

  const candidates = [];

  // std.* → stdlib
  if (parts[0] === "std") {
    const stdRel = parts.slice(1).join(path.sep) + ".cpp";
    candidates.push(path.join(stdRoot, stdRel));
    // Also try .hpp and .h for stdlib headers
    candidates.push(path.join(stdRoot, parts.slice(1).join(path.sep) + ".hpp"));
    candidates.push(path.join(stdRoot, parts.slice(1).join(path.sep) + ".h"));
  } else {
    // relative module
    candidates.push(path.join(fromDir, rel));
    // Also try .hpp and .h extensions
    candidates.push(path.join(fromDir, parts.join(path.sep) + ".hpp"));
    candidates.push(path.join(fromDir, parts.join(path.sep) + ".h"));
    for (const p of includePaths) {
      candidates.push(path.join(p, rel));
      candidates.push(path.join(p, parts.join(path.sep) + ".hpp"));
      candidates.push(path.join(p, parts.join(path.sep) + ".h"));
    }
  }

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return path.resolve(c);
    }
  }
  return null;
}

// --------------------
// Resolve include file (for local #include "..." directives)
// --------------------
function resolveIncludeFile(includeName, fromDir) {
  const extensions = [".h", ".hpp", ".cpp"];
  const candidates = [];
  
  for (const ext of extensions) {
    // First try relative to current file's directory
    candidates.push(path.join(fromDir, includeName + ext));
    // Then try include paths
    for (const p of includePaths) {
      candidates.push(path.join(p, includeName + ext));
    }
  }

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) {
      return path.resolve(c);
    }
  }
  return null;
}

// --------------------
// Import + include loader with include guard support
// --------------------
function loadWithImports(entryPath, seen = new Set(), definedGuards = new Set()) {
  const abs = path.resolve(entryPath);
  if (seen.has(abs)) return "";
  seen.add(abs);

  const dir = path.dirname(abs);
  const raw = stripBOM(fs.readFileSync(abs, "utf8"));
  const lines = raw.split(/\r?\n/);
  
  // Check for include guard at the start of file
  let guardName = null;
  let skipGuardLines = false;
  if (lines.length >= 2) {
    const ifndefMatch = lines[0].match(/^\s*#ifndef\s+([A-Za-z0-9_]+)\s*$/);
    const defineMatch = lines[1].match(/^\s*#define\s+([A-Za-z0-9_]+)\s*$/);
    if (ifndefMatch && defineMatch && ifndefMatch[1] === defineMatch[1]) {
      guardName = ifndefMatch[1];
      if (definedGuards.has(guardName)) {
        // Already included, skip entire file
        return "";
      }
      definedGuards.add(guardName);
      skipGuardLines = true;
    }
  }

  const importRe = /^\s*import\s+([A-Za-z0-9_\.]+)\s*;\s*$/;
  const includeSysRe = /^\s*#include\s*<([^>]+)>\s*$/;
  const includeLocalRe = /^\s*#include\s*"([^"]+)"\s*$/;

  let out = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip include guard lines if detected
    if (skipGuardLines && (i === 0 || i === 1 || (i === lines.length - 1 && /^\s*#endif\s*(\/\/.*)?$/.test(line)))) {
      continue;
    }

    let mod = null;

    // import foo.bar;
    let m = line.match(importRe);
    if (m) {
      mod = m[1];
    }

    // #include <vector> / <bits/stdc++.h>
    let s = line.match(includeSysRe);
    if (s) {
      const name = s[1];
      if (name === "bits/stdc++.h") {
        mod = "std.bits.stdcpp";
      } else {
        mod = "std." + name.replace(/\//g, ".");
      }
    }

    // #include "local.h"
    let l = line.match(includeLocalRe);
    if (l) {
      const includeName = l[1];
      // Try direct file resolution first (preserves .h/.hpp extensions)
      let resolved = resolveIncludeFile(includeName, dir);
      if (!resolved) {
        // Fall back to module resolution (strips extensions)
        mod = includeName
          .replace(/\.h$/, "")
          .replace(/\.hpp$/, "")
          .replace(/\//g, ".");
        resolved = resolveImport(mod, dir);
        if (resolved) {
          out += loadWithImports(resolved, seen, definedGuards);
          out += "\n";
        } else {
          throw new Error(`Cannot resolve include "${includeName}" from ${abs}:${i + 1}`);
        }
      } else {
        out += loadWithImports(resolved, seen, definedGuards);
        out += "\n";
      }
      continue;
    }

    if (mod) {
      const resolved = resolveImport(mod, dir);
      if (!resolved) {
        throw new Error(`Cannot resolve module '${mod}' from ${abs}:${i + 1}`);
      }
      out += loadWithImports(resolved, seen, definedGuards);
      out += "\n";
      continue;
    }

    // IMPORTANT: Skip other preprocessor directives (original behavior)
    if (/^\s*#/.test(line)) {
      continue;
    }

    out += line + "\n";
  }

  return out;
}

// --------------------
// Load entry
// --------------------
let code = loadWithImports(srcPath);

// --------------------
// Auto-inject std prelude
// --------------------
if (injectStd) {
  const preludePath = path.join(stdRoot, "prelude.cpp");
  if (fs.existsSync(preludePath)) {
    const prelude = stripBOM(fs.readFileSync(preludePath, "utf8"));
    code = prelude + "\n\n" + code;
  }
}

// --------------------
// Error helpers
// --------------------
function formatError(e) {
  const msg = e && e.message ? e.message : String(e);
  const loc = e && e.loc ? e.loc : null;
  if (loc && typeof loc.line === "number" && typeof loc.col === "number") {
    // Debug: print the line content
    const lines = code.split("\n");
    if (lines[loc.line - 1]) {
       console.error("Line " + loc.line + ": " + lines[loc.line - 1]);
    }
    return `${msg}\n  at ${srcPath}:${loc.line}:${loc.col}`;
  }
  return msg;
}

function isRuntimeError(e) {
  if (!e) return false;
  if (e.isRuntime === true || e.kind === "runtime") return true;
  if (e.loc) return false;

  const n = e.name || "";
  const m = (e.message || "").toString();

  return (
    n.includes("Runtime") ||
    n.includes("TypeError") ||
    m.includes("stack underflow") ||
    m.includes("null pointer")
  );
}

// --------------------
// Compile + run
// --------------------
try {
  const tokens = lex(code);
  const parser = new Parser(tokens);
  let ast = parser.parse();

  // v1.1: flatten namespaces into global + qualified names
  ast = flattenNamespaces(ast);

  ast = expandTemplates(ast);

  // v1.1+: rewrite a few common std meta-programming stubs into literals
  // so they work without full static-member template specialization support.
  ast = rewriteStdMeta(ast);

  const ir = generateIR(ast);
  const bytecode = lowerIR(ir);

  console.log("OUTPUT:");
  new VM(bytecode).run();
} catch (e) {
  if (isRuntimeError(e)) {
    console.error("\nRUNTIME ERROR:");
  } else {
    console.error("\nCOMPILE ERROR:");
  }
  console.error(formatError(e));
  if (e.stack) {
    console.error("\nStack trace:");
    console.error(e.stack);
  }
  process.exit(1);
}
