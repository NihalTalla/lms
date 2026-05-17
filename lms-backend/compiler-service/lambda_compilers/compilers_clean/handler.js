"use strict";

/**
 * handler.js — AWS Lambda entry point for all 4 compilers.
 *
 * Event shape:
 *   {
 *     "language": "python" | "java" | "c" | "cpp",
 *     "code":     "<source code string>",
 *     "stdin":    "<newline-joined input string, or empty string>"
 *   }
 *
 * Response shape:
 *   {
 *     "stdout": "<program output>",
 *     "stderr": "",
 *     "error":  null | { "type": "COMPILE_ERROR" | "RUNTIME_ERROR", "message": "..." }
 *   }
 */

const fs   = require("fs");
const path = require("path");
const os   = require("os");
const { v4: uuidv4 } = require("uuid");

// ─── Compiler root dirs (relative to this file) ──────────────────────────────
const ROOT         = __dirname;
const C_DIR        = path.join(ROOT, "Cpp and C");
const PYTHON_DIR   = path.join(ROOT, "Python");
const JAVA_DIR     = path.join(ROOT, "Java");
const DEFAULT_TIMEOUT_MS = 3000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 15000;

function envNumber(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function envNumberAny(names, fallback) {
  for (const name of names) {
    const value = Number(process.env[name]);
    if (Number.isFinite(value)) return value;
  }
  return fallback;
}

const CONFIGURED_DEFAULT_TIMEOUT_MS = envNumber("RUNNER_DEFAULT_TIMEOUT_MS", DEFAULT_TIMEOUT_MS);
const CONFIGURED_MIN_TIMEOUT_MS = envNumber("RUNNER_MIN_TIMEOUT_MS", MIN_TIMEOUT_MS);
const CONFIGURED_MAX_TIMEOUT_MS = envNumber("RUNNER_MAX_TIMEOUT_MS", MAX_TIMEOUT_MS);
const MAX_CODE_BYTES = envNumberAny(["RUNNER_MAX_CODE_BYTES", "COMPILER_MAX_CODE_BYTES"], 65_536);
const MAX_STDIN_BYTES = envNumberAny(["RUNNER_MAX_STDIN_BYTES", "COMPILER_MAX_STDIN_BYTES"], 65_536);
const MAX_OUTPUT_BYTES = envNumberAny(["RUNNER_MAX_OUTPUT_BYTES", "COMPILER_MAX_OUTPUT_BYTES"], 65_536);

// ─── readline-sync monkey-patch ──────────────────────────────────────────────
// All 4 VMs call readline.question("") for user input.
// We replace that method with a queue-draining function before each run so the
// VMs never block on real stdin.  Python's VM already has a built-in stdin
// option; we still patch readline-sync for consistency (it would only be hit
// on unexpected extra reads).
const readlineSync = require("readline-sync");
let _stdinQueue = [];
readlineSync.question = function () {
  if (_stdinQueue.length > 0) return _stdinQueue.shift();
  return "";           // EOF: return empty string instead of blocking
};

// Load the queue before each invocation.
function setStdin(stdinStr) {
  _stdinQueue = typeof stdinStr === "string" && stdinStr.length > 0
    ? stdinStr.split(/\r?\n/)
    : [];
}

// ─── Output capture ──────────────────────────────────────────────────────────
// Patch console.log / process.stdout.write to collect output.
// Restored after each run.  Safe in Lambda (one request per process at a time).
class OutputLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "OutputLimitError";
    this.type = "OUTPUT_LIMIT_EXCEEDED";
  }
}

let _stdoutBuf = Buffer.alloc(0);
let _stderrBuf = Buffer.alloc(0);
let _stdoutBytes = 0;
let _stderrBytes = 0;
let _outputTruncated = false;
const _origLog   = console.log.bind(console);
const _origError = console.error.bind(console);
const _origWrite = process.stdout.write.bind(process.stdout);
const _origErrWrite = process.stderr.write.bind(process.stderr);

function appendOutput(target, chunk) {
  const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk), "utf8");
  if (target === "stdout") {
    _stdoutBytes += buf.length;
    if (_stdoutBuf.length < MAX_OUTPUT_BYTES) {
      const remaining = MAX_OUTPUT_BYTES - _stdoutBuf.length;
      _stdoutBuf = Buffer.concat([_stdoutBuf, buf.subarray(0, remaining)]);
    }
    if (_stdoutBytes > MAX_OUTPUT_BYTES) {
      _outputTruncated = true;
      throw new OutputLimitError(`Output limit exceeded (${MAX_OUTPUT_BYTES} bytes)`);
    }
    return;
  }

  _stderrBytes += buf.length;
  if (_stderrBuf.length < MAX_OUTPUT_BYTES) {
    const remaining = MAX_OUTPUT_BYTES - _stderrBuf.length;
    _stderrBuf = Buffer.concat([_stderrBuf, buf.subarray(0, remaining)]);
  }
  if (_stderrBytes > MAX_OUTPUT_BYTES) {
    _outputTruncated = true;
    throw new OutputLimitError(`Output limit exceeded (${MAX_OUTPUT_BYTES} bytes)`);
  }
}

function startCapture() {
  _stdoutBuf = Buffer.alloc(0);
  _stderrBuf = Buffer.alloc(0);
  _stdoutBytes = 0;
  _stderrBytes = 0;
  _outputTruncated = false;

  console.log = (...args) => {
    appendOutput("stdout", args.join(" ") + "\n");
  };
  console.error = (...args) => {
    appendOutput("stderr", args.join(" ") + "\n");
  };
  process.stdout.write = (chunk) => {
    appendOutput("stdout", chunk);
    return true;
  };
  process.stderr.write = (chunk) => {
    appendOutput("stderr", chunk);
    return true;
  };
}

function stopCapture() {
  console.log = _origLog;
  console.error = _origError;
  process.stdout.write = _origWrite;
  process.stderr.write = _origErrWrite;
  return {
    stdout: _stdoutBuf.toString("utf8"),
    stderr: _stderrBuf.toString("utf8"),
    stdoutBytes: _stdoutBytes,
    stderrBytes: _stderrBytes,
    outputTruncated: _outputTruncated
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeTmpFile(ext, content) {
  const p = path.join(os.tmpdir(), `${uuidv4()}${ext}`);
  fs.writeFileSync(p, content, "utf8");
  return p;
}

function cleanTmp(p) {
  try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch (_) {}
}

function isRuntimeError(e) {
  if (!e) return false;
  if (e.isRuntime === true || e.kind === "runtime") return true;
  const n = (e.name    || "").toString();
  const m = (e.message || "").toString();
  return (
    n.includes("Runtime") ||
    n.includes("TypeError") ||
    m.includes("stack underflow") ||
    m.includes("null pointer") ||
    m.includes("execution limit") ||
    m.includes("time limit")
  );
}

function getTimeoutMs(event) {
  const value = Number(event && event.timeoutMs);
  if (!Number.isFinite(value)) return CONFIGURED_DEFAULT_TIMEOUT_MS;

  const lowerBound = Math.min(CONFIGURED_MIN_TIMEOUT_MS, CONFIGURED_MAX_TIMEOUT_MS);
  const upperBound = Math.max(CONFIGURED_MIN_TIMEOUT_MS, CONFIGURED_MAX_TIMEOUT_MS);
  return Math.min(upperBound, Math.max(lowerBound, Math.floor(value)));
}

function runWithTimeout(runFn, timeoutMs) {
  let timer = null;
  return Promise.race([
    Promise.resolve().then(runFn),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`time limit exceeded (${timeoutMs} ms)`)), timeoutMs);
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// ─── Language runners ─────────────────────────────────────────────────────────

// ── Python ────────────────────────────────────────────────────────────────────
function runPython(code, stdin) {
  const lexer      = require(path.join(PYTHON_DIR, "python/lexer"));
  const Parser     = require(path.join(PYTHON_DIR, "python/parser"));
  const irgen      = require(path.join(PYTHON_DIR, "python/irgen"));
  const lowerIR    = require(path.join(PYTHON_DIR, "ir/ir_lower"));
  const VM         = require(path.join(PYTHON_DIR, "vm/vm"));

  const tokens   = lexer(code);
  const parser   = new Parser(tokens);
  const ast      = parser.parse();
  const ir       = irgen(ast);
  const bytecode = lowerIR(ir);

  // Python VM natively supports stdin injection via options object
  new VM(bytecode, { stdin: stdin || "" }).run();
}

// ── Java ──────────────────────────────────────────────────────────────────────
function runJava(code, stdin) {
  const compileAndRun = require(path.join(JAVA_DIR, "java/index"));
  // compileAndRun() internally creates the VM — readline-sync is already
  // monkey-patched so input reads hit our queue.
  setStdin(stdin);
  compileAndRun(code);
}

// ── C ─────────────────────────────────────────────────────────────────────────
function runC(code, stdin) {
  const { preprocess } = require(path.join(C_DIR, "c/preprocessor"));
  const { Lexer }      = require(path.join(C_DIR, "c/lexer"));
  const { Parser }     = require(path.join(C_DIR, "c/parser"));
  const sema           = require(path.join(C_DIR, "c/sema"));
  const generateIR     = require(path.join(C_DIR, "c/irgen"));
  const lowerIR        = require(path.join(C_DIR, "ir/ir_lower"));
  const VM             = require(path.join(C_DIR, "vm/vm"));

  // Write code to /tmp so the preprocessor can resolve relative #includes
  const tmpFile = makeTmpFile(".c", code);
  try {
    setStdin(stdin);
    const baseDir      = path.dirname(tmpFile);
    const preprocessed = preprocess(code, baseDir);

    const lexer  = new Lexer(preprocessed);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast    = parser.parseProgram();

    const semaResult = sema.analyze(ast);
    const ir         = generateIR(semaResult);
    const bytecode   = lowerIR(ir);

    new VM(bytecode).run();
  } finally {
    cleanTmp(tmpFile);
  }
}

// ── C++ ───────────────────────────────────────────────────────────────────────

// loadWithImports is extracted verbatim from cpp/run.js (pure function, no side
// effects — it only reads from disk).  We parameterise stdRoot and includePaths
// so handler.js controls all paths.
function _cppLoadWithImports(entryPath, stdRoot, includePaths, seen = new Set(), definedGuards = new Set()) {
  const abs = path.resolve(entryPath);
  if (seen.has(abs)) return "";
  seen.add(abs);

  const dir = path.dirname(abs);
  const stripBOM = (s) => s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
  const raw = stripBOM(fs.readFileSync(abs, "utf8"));
  const lines = raw.split(/\r?\n/);

  // include guard detection
  let guardName = null, skipGuardLines = false;
  if (lines.length >= 2) {
    const ifn = lines[0].match(/^\s*#ifndef\s+([A-Za-z0-9_]+)\s*$/);
    const def = lines[1].match(/^\s*#define\s+([A-Za-z0-9_]+)\s*$/);
    if (ifn && def && ifn[1] === def[1]) {
      guardName = ifn[1];
      if (definedGuards.has(guardName)) return "";
      definedGuards.add(guardName);
      skipGuardLines = true;
    }
  }

  const importRe      = /^\s*import\s+([A-Za-z0-9_.]+)\s*;\s*$/;
  const includeSysRe  = /^\s*#include\s*<([^>]+)>\s*$/;
  const includeLocalRe = /^\s*#include\s*"([^"]+)"\s*$/;

  function resolveModule(moduleName, fromDir) {
    const parts = moduleName.split(".");
    const candidates = [];
    if (parts[0] === "std") {
      const rel = parts.slice(1).join(path.sep);
      candidates.push(path.join(stdRoot, rel + ".cpp"),
                       path.join(stdRoot, rel + ".hpp"),
                       path.join(stdRoot, rel + ".h"));
    } else {
      const rel = parts.join(path.sep);
      candidates.push(path.join(fromDir, rel + ".cpp"),
                       path.join(fromDir, rel + ".hpp"),
                       path.join(fromDir, rel + ".h"));
      for (const p of includePaths) {
        candidates.push(path.join(p, rel + ".cpp"),
                         path.join(p, rel + ".hpp"),
                         path.join(p, rel + ".h"));
      }
    }
    return candidates.find(c => { try { return fs.statSync(c).isFile(); } catch (_) { return false; } }) || null;
  }

  function resolveInclude(name, fromDir) {
    const base = name.replace(/\.(h|hpp|cpp)$/, "");
    for (const ext of [".h", ".hpp", ".cpp"]) {
      const c1 = path.join(fromDir, base + ext);
      if (fs.existsSync(c1)) return path.resolve(c1);
      for (const p of includePaths) {
        const c2 = path.join(p, base + ext);
        if (fs.existsSync(c2)) return path.resolve(c2);
      }
    }
    return null;
  }

  let out = "";
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (skipGuardLines && (i === 0 || i === 1 || (i === lines.length - 1 && /^\s*#endif\s*(\/\/.*)?$/.test(line)))) continue;

    const mImp = line.match(importRe);
    if (mImp) {
      const resolved = resolveModule(mImp[1], dir);
      if (!resolved) throw new Error(`Cannot resolve module '${mImp[1]}' from ${abs}:${i + 1}`);
      out += _cppLoadWithImports(resolved, stdRoot, includePaths, seen, definedGuards) + "\n";
      continue;
    }

    const mSys = line.match(includeSysRe);
    if (mSys) {
      const name = mSys[1];
      const mod  = name === "bits/stdc++.h" ? "std.bits.stdcpp" : "std." + name.replace(/\//g, ".");
      const resolved = resolveModule(mod, dir);
      if (!resolved) throw new Error(`Cannot resolve <${name}> from ${abs}:${i + 1}`);
      out += _cppLoadWithImports(resolved, stdRoot, includePaths, seen, definedGuards) + "\n";
      continue;
    }

    const mLoc = line.match(includeLocalRe);
    if (mLoc) {
      const resolved = resolveInclude(mLoc[1], dir) || resolveModule(
        mLoc[1].replace(/\.(h|hpp|cpp)$/, "").replace(/\//g, "."), dir
      );
      if (!resolved) throw new Error(`Cannot resolve include "${mLoc[1]}" from ${abs}:${i + 1}`);
      out += _cppLoadWithImports(resolved, stdRoot, includePaths, seen, definedGuards) + "\n";
      continue;
    }

    if (/^\s*#/.test(line)) continue;   // skip remaining preprocessor directives
    out += line + "\n";
  }
  return out;
}

function runCpp(code, stdin) {
  const lex              = require(path.join(C_DIR, "cpp/lexer"));
  const Parser           = require(path.join(C_DIR, "cpp/parser"));
  const { flattenNamespaces } = require(path.join(C_DIR, "cpp/namespaces"));
  const { expandTemplates }   = require(path.join(C_DIR, "cpp/templates"));
  const { rewriteStdMeta }    = require(path.join(C_DIR, "cpp/rewrite_stdmeta"));
  const generateIR       = require(path.join(C_DIR, "cpp/irgen"));
  const lowerIR          = require(path.join(C_DIR, "ir/ir_lower"));
  const VM               = require(path.join(C_DIR, "vm/vm"));

  const stdRoot      = path.join(C_DIR, "cpp/stdlib");
  const tmpFile      = makeTmpFile(".cpp", code);

  try {
    setStdin(stdin);

    let src = _cppLoadWithImports(tmpFile, stdRoot, []);

    // Auto-inject std prelude
    const preludePath = path.join(stdRoot, "prelude.cpp");
    if (fs.existsSync(preludePath)) {
      const prelude = fs.readFileSync(preludePath, "utf8");
      src = prelude + "\n\n" + src;
    }

    const tokens   = lex(src);
    const parser   = new Parser(tokens);
    let ast        = parser.parse();
    ast = flattenNamespaces(ast);
    ast = expandTemplates(ast);
    ast = rewriteStdMeta(ast);

    const ir       = generateIR(ast);
    const bytecode = lowerIR(ir);

    new VM(bytecode).run();
  } finally {
    cleanTmp(tmpFile);
  }
}

// ─── Dispatch table ───────────────────────────────────────────────────────────
const RUNNERS = {
  python: runPython,
  java:   runJava,
  c:      runC,
  cpp:    runCpp,
};

// ─── Lambda handler ───────────────────────────────────────────────────────────
exports.handler = async function (event) {
  const language = (event.language || "").toLowerCase().trim();
  const code     = event.code  || "";
  const stdin    = event.stdin || "";
  const timeoutMs = getTimeoutMs(event);
  const codeBytes = Buffer.byteLength(code, "utf8");
  const stdinBytes = Buffer.byteLength(stdin, "utf8");

  if (!RUNNERS[language]) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        stdout: "",
        stderr: "",
        error: {
          type:    "INVALID_LANGUAGE",
          message: `Unsupported language '${language}'. Valid options: python, java, c, cpp`,
        },
      }),
    };
  }

  if (!code.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        stdout: "",
        stderr: "",
        error: { type: "EMPTY_CODE", message: "No source code provided." },
      }),
    };
  }

  if (codeBytes > MAX_CODE_BYTES) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        stdout: "",
        stderr: "",
        error: {
          type: "INPUT_TOO_LARGE",
          message: `Code size ${codeBytes} bytes exceeds limit (${MAX_CODE_BYTES}).`
        }
      })
    };
  }

  if (stdinBytes > MAX_STDIN_BYTES) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        stdout: "",
        stderr: "",
        error: {
          type: "INPUT_TOO_LARGE",
          message: `Stdin size ${stdinBytes} bytes exceeds limit (${MAX_STDIN_BYTES}).`
        }
      })
    };
  }

  const execStart = Date.now();
  startCapture();
  try {
    await runWithTimeout(() => RUNNERS[language](code, stdin), timeoutMs);
    const capture = stopCapture();
    const execTimeMs = Date.now() - execStart;
    return {
      statusCode: 200,
      body: JSON.stringify({
        stdout: capture.stdout,
        stderr: capture.stderr,
        stdoutBytes: capture.stdoutBytes,
        stderrBytes: capture.stderrBytes,
        outputTruncated: capture.outputTruncated,
        execTimeMs,
        error: null
      }),
    };
  } catch (e) {
    const capture = stopCapture();          // capture anything printed before the error
    const message = e && e.message ? e.message : String(e);
    const type = e && e.type === "OUTPUT_LIMIT_EXCEEDED"
      ? "OUTPUT_LIMIT_EXCEEDED"
      : message.toLowerCase().includes("time limit")
        ? "TIME_LIMIT_EXCEEDED"
        : (isRuntimeError(e) ? "RUNTIME_ERROR" : "COMPILE_ERROR");
    const execTimeMs = Date.now() - execStart;
    return {
      statusCode: 200,                     // always 200; error is in the body
      body: JSON.stringify({
        stdout: capture.stdout,
        stderr: capture.stderr,
        stdoutBytes: capture.stdoutBytes,
        stderrBytes: capture.stderrBytes,
        outputTruncated: capture.outputTruncated,
        execTimeMs,
        error: { type, message }
      }),
    };
  }
};
