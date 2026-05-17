const fs = require('fs');
const path = require('path');

const srcPath = process.argv[2] || path.join(__dirname, 'test', 'test.cpp');
const stdRoot = path.join(__dirname, 'cpp', 'stdlib');

function stripBOM(s) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

function resolveImport(moduleName, fromDir) {
  const parts = moduleName.split('.');
  const rel = parts.join(path.sep) + '.cpp';
  const candidates = [];

  if (parts[0] === 'std') {
    const stdRel = parts.slice(1).join(path.sep) + '.cpp';
    candidates.push(path.join(stdRoot, stdRel));
    candidates.push(path.join(stdRoot, rel));
  }

  candidates.push(path.join(fromDir, rel));
  candidates.push(path.join(stdRoot, rel));

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function loadWithImports(entryPath, seen = new Set()) {
  const abs = path.resolve(entryPath);
  if (seen.has(abs)) return '';
  seen.add(abs);

  const dir = path.dirname(abs);
  const raw = stripBOM(fs.readFileSync(abs, 'utf8'));
  const lines = raw.split(/\r?\n/);
  let out = '';

  for (const line of lines) {
    const m = line.match(/^\s*#include\s*<([^>]+)>\s*$/);
    if (m) {
      const hdr = m[1].trim();
      const moduleName = hdr
        .replace(/\.h$/,'')
        .replace(/^bits\/stdc\+\+$/,'std.bits.stdcpp')
        .replace(/\//g,'.')
        .replace(/^stdc\+\+$/,'std.bits.stdcpp')
        .replace(/^iostream$/,'std.iostream')
        .replace(/^vector$/,'std.vector')
        .replace(/^string$/,'std.string')
        .replace(/^map$/,'std.map')
        .replace(/^set$/,'std.set')
        .replace(/^queue$/,'std.queue')
        .replace(/^stack$/,'std.stack')
        .replace(/^array$/,'std.array')
        .replace(/^tuple$/,'std.tuple')
        .replace(/^pair$/,'std.pair')
        .replace(/^algorithm$/,'std.algorithm')
        .replace(/^type_traits$/,'std.type_traits')
        .replace(/^limits$/,'std.limits');

      const resolved = resolveImport(moduleName, dir);
      if (!resolved) {
        throw new Error(`Cannot resolve include <${hdr}> from ${abs}`);
      }
      out += loadWithImports(resolved, seen);
      out += '\n';
      continue;
    }

    // also support `import ...;` (our language)
    const im = line.match(/^\s*import\s+([A-Za-z0-9_\.]+)\s*;\s*$/);
    if (im) {
      const moduleName = im[1];
      const resolved = resolveImport(moduleName, dir);
      if (!resolved) {
        throw new Error(`Cannot resolve import ${moduleName} from ${abs}`);
      }
      out += loadWithImports(resolved, seen);
      out += '\n';
      continue;
    }

    out += line + '\n';
  }

  return out;
}

const preludePath = path.join(stdRoot, 'prelude.cpp');
const prelude = fs.readFileSync(preludePath, 'utf8');
const combined = prelude + '\n\n' + loadWithImports(srcPath);

const lines = combined.split(/\r?\n/);
const start = parseInt(process.argv[3] || '820', 10);
const end = parseInt(process.argv[4] || '850', 10);
for (let i = start; i <= end && i <= lines.length; i++) {
  const s = String(i).padStart(5,' ');
  console.log(`${s}: ${lines[i-1]}`);
}
