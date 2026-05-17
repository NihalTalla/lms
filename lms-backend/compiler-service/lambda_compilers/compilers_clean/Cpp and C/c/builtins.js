// c/builtins.js — C standard-library builtin signatures for the C front-end.
//
// This file exposes TRUE C standard-library names (printf, scanf, strlen, abs …)
// as sema-visible builtins while mapping them to VM-level handlers.
//
// printf / scanf / fprintf / sscanf are handled as SPECIAL CASES in irgen.js
// (compile-time format-string expansion), so they are registered here with
// anyArgs:true purely so that sema accepts any call signature.

const Types = require("./types");

function makeFuncSig(ret, params, vmName = null, options = null) {
  return { ret, params, vmName: vmName || null, options: options || null };
}

function buildBuiltins(tf) {
  const builtins = new Map();

  // ── Legacy VM-style print (unchanged) ──────────────────────────────────────
  builtins.set("print",       makeFuncSig(tf.void(), [tf.int()], "print",  { anyArgs: true, anyArgCount: 1 }));
  builtins.set("print_int",   makeFuncSig(tf.void(), [tf.int()], "print"));
  builtins.set("print_float", makeFuncSig(tf.void(), [tf.float()], "print"));
  builtins.set("print_char",  makeFuncSig(tf.void(), [tf.char()], "print"));
  builtins.set("print_str",   makeFuncSig(tf.void(), [tf.ptr(tf.char())], "print"));

  // ── stdio.h ─────────────────────────────────────────────────────────────────
  builtins.set("printf",   makeFuncSig(tf.int(), [tf.ptr(tf.char())], "printf",   { anyArgs: true }));
  builtins.set("fprintf",  makeFuncSig(tf.int(), [tf.int(), tf.ptr(tf.char())], "fprintf",  { anyArgs: true }));
  builtins.set("sprintf",  makeFuncSig(tf.int(), [tf.ptr(tf.char()), tf.ptr(tf.char())], "sprintf",  { anyArgs: true }));
  builtins.set("snprintf", makeFuncSig(tf.int(), [tf.ptr(tf.char()), tf.int(), tf.ptr(tf.char())], "snprintf", { anyArgs: true }));
  builtins.set("scanf",    makeFuncSig(tf.int(), [tf.ptr(tf.char())], "scanf",    { anyArgs: true }));
  builtins.set("fscanf",   makeFuncSig(tf.int(), [tf.int(), tf.ptr(tf.char())], "fscanf",   { anyArgs: true }));
  builtins.set("sscanf",   makeFuncSig(tf.int(), [tf.ptr(tf.char()), tf.ptr(tf.char())], "sscanf",   { anyArgs: true }));
  builtins.set("putchar",  makeFuncSig(tf.int(), [tf.int()], "putchar"));
  builtins.set("getchar",  makeFuncSig(tf.int(), [], "getchar"));
  builtins.set("puts",     makeFuncSig(tf.int(), [tf.ptr(tf.char())], "puts"));
  builtins.set("putc",     makeFuncSig(tf.int(), [tf.int(), tf.int()], "putchar"));
  builtins.set("fflush",   makeFuncSig(tf.int(), [tf.int()], "fflush", { anyArgs: true }));

  // ── string.h ────────────────────────────────────────────────────────────────
  builtins.set("strlen",   makeFuncSig(tf.int(), [tf.ptr(tf.char())], "strlen"));
  builtins.set("strcpy",   makeFuncSig(tf.ptr(tf.char()), [tf.ptr(tf.char()), tf.ptr(tf.char())], "strcpy"));
  builtins.set("strncpy",  makeFuncSig(tf.ptr(tf.char()), [tf.ptr(tf.char()), tf.ptr(tf.char()), tf.int()], "strncpy"));
  builtins.set("strcat",   makeFuncSig(tf.ptr(tf.char()), [tf.ptr(tf.char()), tf.ptr(tf.char())], "strcat"));
  builtins.set("strncat",  makeFuncSig(tf.ptr(tf.char()), [tf.ptr(tf.char()), tf.ptr(tf.char()), tf.int()], "strncat"));
  builtins.set("strcmp",   makeFuncSig(tf.int(), [tf.ptr(tf.char()), tf.ptr(tf.char())], "strcmp"));
  builtins.set("strncmp",  makeFuncSig(tf.int(), [tf.ptr(tf.char()), tf.ptr(tf.char()), tf.int()], "strncmp"));
  builtins.set("strchr",   makeFuncSig(tf.ptr(tf.char()), [tf.ptr(tf.char()), tf.int()], "strchr"));
  builtins.set("strstr",   makeFuncSig(tf.ptr(tf.char()), [tf.ptr(tf.char()), tf.ptr(tf.char())], "strstr"));
  builtins.set("strtok",   makeFuncSig(tf.ptr(tf.char()), [tf.ptr(tf.char()), tf.ptr(tf.char())], "strtok"));
  builtins.set("strrev",   makeFuncSig(tf.ptr(tf.char()), [tf.ptr(tf.char())], "strrev"));
  builtins.set("strtol",   makeFuncSig(tf.int(), [tf.ptr(tf.char()), tf.ptr(tf.void()), tf.int()], "strtol", { anyArgs: true }));
  builtins.set("strtod",   makeFuncSig(tf.float(), [tf.ptr(tf.char()), tf.ptr(tf.void())], "strtod", { anyArgs: true }));

  // ── stdlib.h ────────────────────────────────────────────────────────────────
  builtins.set("atoi",    makeFuncSig(tf.int(),   [tf.ptr(tf.char())], "atoi"));
  builtins.set("atof",    makeFuncSig(tf.float(), [tf.ptr(tf.char())], "atof"));
  builtins.set("atol",    makeFuncSig(tf.int(),   [tf.ptr(tf.char())], "atol"));
  builtins.set("abs",     makeFuncSig(tf.int(),   [tf.int()],          "c_abs"));
  builtins.set("labs",    makeFuncSig(tf.int(),   [tf.int()],          "c_abs"));
  builtins.set("llabs",   makeFuncSig(tf.int(),   [tf.int()],          "c_abs"));
  builtins.set("rand",    makeFuncSig(tf.int(),   [],                  "c_rand"));
  builtins.set("srand",   makeFuncSig(tf.void(),  [tf.int()],          "c_srand"));
  builtins.set("qsort",   makeFuncSig(tf.void(),  [tf.ptr(tf.void()), tf.int(), tf.int(), tf.ptr(tf.void())], "c_qsort", { anyArgs: true }));

  // ── math.h ──────────────────────────────────────────────────────────────────
  builtins.set("sqrt",    makeFuncSig(tf.float(), [tf.float()], "c_sqrt"));
  builtins.set("fabs",    makeFuncSig(tf.float(), [tf.float()], "c_fabs"));
  builtins.set("ceil",    makeFuncSig(tf.float(), [tf.float()], "c_ceil"));
  builtins.set("floor",   makeFuncSig(tf.float(), [tf.float()], "c_floor"));
  builtins.set("round",   makeFuncSig(tf.float(), [tf.float()], "c_round"));
  builtins.set("pow",     makeFuncSig(tf.float(), [tf.float(), tf.float()], "c_pow"));
  builtins.set("log",     makeFuncSig(tf.float(), [tf.float()], "c_log"));
  builtins.set("log2",    makeFuncSig(tf.float(), [tf.float()], "c_log2"));
  builtins.set("log10",   makeFuncSig(tf.float(), [tf.float()], "c_log10"));
  builtins.set("exp",     makeFuncSig(tf.float(), [tf.float()], "c_exp"));
  builtins.set("sin",     makeFuncSig(tf.float(), [tf.float()], "c_sin"));
  builtins.set("cos",     makeFuncSig(tf.float(), [tf.float()], "c_cos"));
  builtins.set("tan",     makeFuncSig(tf.float(), [tf.float()], "c_tan"));
  builtins.set("fmin",    makeFuncSig(tf.float(), [tf.float(), tf.float()], "c_fmin"));
  builtins.set("fmax",    makeFuncSig(tf.float(), [tf.float(), tf.float()], "c_fmax"));
  builtins.set("fmod",    makeFuncSig(tf.float(), [tf.float(), tf.float()], "c_fmod"));
  builtins.set("hypot",   makeFuncSig(tf.float(), [tf.float(), tf.float()], "c_hypot"));
  builtins.set("atan2",   makeFuncSig(tf.float(), [tf.float(), tf.float()], "c_atan2"));

  // ── Memory management (unchanged) ───────────────────────────────────────────
  builtins.set("malloc",  makeFuncSig(tf.ptr(tf.void()), [tf.int()], "malloc"));
  builtins.set("calloc",  makeFuncSig(tf.ptr(tf.void()), [tf.int(), tf.int()], "calloc"));
  builtins.set("realloc", makeFuncSig(tf.ptr(tf.void()), [tf.ptr(tf.void()), tf.int()], "realloc", { anyArgs: true }));
  builtins.set("free",    makeFuncSig(tf.void(), [tf.ptr(tf.void())], "free"));
  builtins.set("memset",  makeFuncSig(tf.ptr(tf.void()), [tf.ptr(tf.void()), tf.int(), tf.int()], "memset"));
  builtins.set("memcpy",  makeFuncSig(tf.ptr(tf.void()), [tf.ptr(tf.void()), tf.ptr(tf.void()), tf.int()], "memcpy"));
  builtins.set("memmove", makeFuncSig(tf.ptr(tf.void()), [tf.ptr(tf.void()), tf.ptr(tf.void()), tf.int()], "memmove"));

  // ── Process ─────────────────────────────────────────────────────────────────
  builtins.set("exit",    makeFuncSig(tf.void(), [tf.int()], "exit"));
  builtins.set("abort",   makeFuncSig(tf.void(), [], "abort"));

  // ── Fast IO (competitive programming) ───────────────────────────────────────
  builtins.set("readInt",     makeFuncSig(tf.int(),   [], "readInt"));
  builtins.set("readLong",    makeFuncSig(tf.int(),   [], "readLong"));
  builtins.set("readDouble",  makeFuncSig(tf.float(), [], "readDouble"));
  builtins.set("writeInt",    makeFuncSig(tf.void(),  [tf.int()],   "writeInt"));
  builtins.set("writeLong",   makeFuncSig(tf.void(),  [tf.int()],   "writeLong"));
  builtins.set("writeDouble", makeFuncSig(tf.void(),  [tf.float()], "writeDouble"));
  builtins.set("writeChar",   makeFuncSig(tf.void(),  [tf.char()],  "writeChar"));
  builtins.set("writeString", makeFuncSig(tf.void(),  [tf.ptr(tf.char())], "writeString"));
  builtins.set("newline",     makeFuncSig(tf.void(),  [], "newline"));

  return builtins;
}

function registerBuiltins(semaContext) {
  const { tf, globalScope, funcs, FuncSymbol } = semaContext;
  const builtins = buildBuiltins(tf);

  for (const [name, sig] of builtins.entries()) {
    if (funcs.has(name)) continue;

    const ftype = { kind: "func", ret: sig.ret, params: sig.params };
    const fs = new FuncSymbol(name, ftype, /*declNode*/ null);
    fs.isDefined = true;
    fs.isBuiltin = true;
    fs.vmName = sig.vmName || null;
    fs.builtinOptions = sig.options || null;

    funcs.set(name, fs);
    if (!globalScope.lookupHere(name)) globalScope.define(fs);
  }

  return builtins;
}

module.exports = { buildBuiltins, registerBuiltins };
