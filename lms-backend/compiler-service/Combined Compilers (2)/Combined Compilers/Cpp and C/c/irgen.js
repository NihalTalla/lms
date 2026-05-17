// compiler/c/irgen.js
// C front-end IR generator (targets existing IR + VM via ir/ir_lower.js)
//
// Assumptions / subset (v1):
// - Pure C subset already parsed & type-checked by compiler/c/sema.js
// - Functions are direct calls by name (no function pointers yet)
// - Struct values are represented as VM "struct objects" (same as C++ POD structs):
//     - creation: ALLOC_STRUCT {name,n}
//     - field read: LOAD_FIELD {offset}
//     - field write: STORE_FIELD {offset}
// - Pointers:
//     - &x => ADDR_VAR x
//     - *p  => LOAD_PTR
//     - p->f => LOAD_PTR_FIELD {offset}
//     - *p = v => STORE_PTR
// - Address-of for struct fields is limited to cases we can lower using ADDR_PTR_FIELD:
//     - &(s.field) where s is an lvalue we can take address of (Identifier, *ptr, ptr->field, etc.)
//     - Notably: &(someCall().field) is not supported in this subset.
//
// IMPORTANT:
// This file intentionally mirrors style/ops used by compiler/cpp/irgen.js.

const { IRProgram } = require("../ir/ir");

// If you have a C-specific CompileError class later, you can swap this.
function cerror(message, loc = null) {
  const where = loc && typeof loc.line === "number" && typeof loc.column === "number"
    ? `${loc.line}:${loc.column}`
    : "?:?";
  const e = new Error(`COMPILE ERROR:\n${message}\n  at ${where}`);
  e.loc = loc || null;
  throw e;
}

function locOf(node) {
  return node && node.loc ? node.loc : null;
}

// ----------------------------
// IR Generation
// ----------------------------
function generateIR(semaResult) {
  // semaResult is the object returned by compiler/c/sema.js analyze()
  //   { program, tf, globalScope, structs, funcs, globals, ... }
  if (!semaResult || !semaResult.program) {
    cerror("Internal: irgen expects semaResult from c/sema.analyze()", null);
  }

  const { program, tf, funcs, globals, structs } = semaResult;

  const ir = new IRProgram();

  // Ensure main exists
  const mainSym = funcs.get("main");
  if (!mainSym) cerror("No main() function found", null);

  // ----------------------------
  // Helpers: type queries
  // ----------------------------
  function isStructType(t) {
    return t && t.kind === "struct";
  }
  function isPointerType(t) {
    return t && t.kind === "pointer";
  }
  function isFloatType(t) {
    return t && t.kind === "primitive" && t.name === "float";
  }
  function isIntLikeType(t) {
    return t && t.kind === "primitive" && (t.name === "int" || t.name === "char");
  }
  function sameType(a, b) {
    // Types.sameType exists, but semaResult doesn't export it; we can do minimal here:
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.kind !== b.kind) return false;
    if (a.kind === "primitive") return a.name === b.name;
    if (a.kind === "pointer") return sameType(a.base, b.base);
    if (a.kind === "array") return a.length === b.length && sameType(a.base, b.base);
    if (a.kind === "struct") return a.tag === b.tag;
    return false;
  }

  function structLayout(st) {
    // st is StructType from types.js (resolved by sema)
    if (!st || st.kind !== "struct" || !st.isResolved()) {
      cerror(`Internal: unresolved struct type '${st ? st.toString() : "?"}'`, null);
    }
    return { name: st.tag, n: st.fields.length };
  }

  // ----------------------------
  // Function declarations in IR
  // ----------------------------
  // We follow the same convention as cpp/irgen:
  // - Emit a jump over all function bodies to the entry
  // - Emit FUNC_LABEL blocks for each function
  const entryJump = ir.emit("JUMP", null);

  // Emit all functions (main last is okay; VM resolves by labels in lowering pass)
  // We'll emit in source order to keep stable.
  const funcDecls = program.decls.filter((d) => d.kind === "FunctionDecl" && !d.isPrototype);

  // Loop patch stack for break/continue
  const loopStack = []; // Array of { breakTarget, continueTarget }
  // Per-function label maps for goto/labels
  let labelAddrs = null;     // Map<string, number>
  let pendingGotos = null;   // Map<string, number[]>

  // Helpers for statement termination checking
  function stmtAlwaysTerminates(s) {
    if (!s) return false;
    return s.kind === "ReturnStmt";
  }

  // ============================================================
  // Helper: process C escape sequences in a raw lexer string
  // (the lexer keeps \n as two chars '\\' + 'n')
  // ============================================================
  function _processEscapes(s) {
    let r = "", i = 0;
    while (i < s.length) {
      if (s[i] === "\\" && i + 1 < s.length) {
        const c = s[++i];
        if      (c === "n")  r += "\n";
        else if (c === "t")  r += "\t";
        else if (c === "r")  r += "\r";
        else if (c === "\\") r += "\\";
        else if (c === '"')  r += '"';
        else if (c === "'")  r += "'";
        else if (c === "0")  r += "\0";
        else if (c === "a")  r += "\x07";
        else if (c === "b")  r += "\x08";
        else if (c === "f")  r += "\x0C";
        else if (c === "v")  r += "\x0B";
        else r += c;
      } else {
        r += s[i];
      }
      i++;
    }
    return r;
  }

  // ============================================================
  // Helper: emit scanf store — value is on stack, store via ptr
  // ============================================================
  function _emitScanfStore(ptrArg) {
    if (!ptrArg) return;
    // Most common: &x  (UnaryExpr & IdentifierExpr) → STORE directly
    if (ptrArg.kind === "UnaryExpr" && ptrArg.op === "&" && ptrArg.expr.kind === "IdentifierExpr") {
      ir.emit("STORE", ptrArg.expr.name);
      return;
    }
    // &a[i]
    if (ptrArg.kind === "UnaryExpr" && ptrArg.op === "&" && ptrArg.expr.kind === "IndexExpr") {
      const tmp = `__sf${ir.instructions.length}`;
      ir.emit("STORE", tmp);
      genExpr(ptrArg.expr.array);
      genExpr(ptrArg.expr.index);
      ir.emit("LOAD", tmp);
      ir.emit("STORE_INDEX");
      return;
    }
    // pointer variable: just STORE via pointer
    const tmp = `__sf${ir.instructions.length}`;
    ir.emit("STORE", tmp);
    genExpr(ptrArg);          // loads pointer value
    ir.emit("LOAD", tmp);
    ir.emit("STORE_PTR");
  }

  // ----------------------------
  // Expression generation
  // ----------------------------
  // In this compiler, LOAD/STORE use variable names directly.
  // We'll generate rvalues by default.
  function genExpr(node) {
    if (!node) return;

    switch (node.kind) {
      case "IntLiteralExpr":
        ir.emit("PUSH_CONST", Number(node.value));
        return;

      case "FloatLiteralExpr":
        ir.emit("PUSH_CONST", Number(node.value));
        return;

      case "CharLiteralExpr": {
        // sema stores raw inner text (no quotes) in node.value.
        // We need to process escape sequences: \n -> 10, \t -> 9, etc.
        const v = node.value;
        let num;
        if (typeof v === "number") {
          num = v;
        } else if (v && v.length) {
          if (v[0] === "\\" && v.length >= 2) {
            // Escape sequence
            const esc = v[1];
            if      (esc === "n")  num = 10;
            else if (esc === "t")  num = 9;
            else if (esc === "r")  num = 13;
            else if (esc === "0")  num = 0;
            else if (esc === "\\") num = 92;
            else if (esc === "'")  num = 39;
            else if (esc === '"')  num = 34;
            else if (esc === "a")  num = 7;
            else if (esc === "b")  num = 8;
            else if (esc === "f")  num = 12;
            else if (esc === "v")  num = 11;
            else num = v.charCodeAt(1);
          } else {
            num = v.charCodeAt(0);
          }
        } else {
          num = 0;
        }
        ir.emit("PUSH_CONST", num);
        return;
      }

      case "StringLiteralExpr":
        // VM treats JS strings as values; store as const.
        ir.emit("PUSH_CONST", node.value);
        return;

      case "IdentifierExpr": {
        // For structs, loading the value should preserve value semantics in expressions.
        // Our VM struct objects are mutable references, so we CLONE_STRUCT when used as an rvalue.
        const sym = node.symbol;
        if (!sym) cerror(`Internal: unresolved identifier '${node.name}'`, locOf(node));
        ir.emit("LOAD", node.name);
        if (sym.kind === "var" && isStructType(sym.type)) {
          ir.emit("CLONE_STRUCT");
        }
        return;
      }

      case "UnaryExpr": {
        const op = node.op;

        if (op === "&") {
          genAddrOfLValue(node.expr);
          return;
        }

        if (op === "*") {
          genExpr(node.expr);
          ir.emit("LOAD_PTR");
          return;
        }

        if (op === "!") {
          genExpr(node.expr);
          ir.emit("NOT");
          return;
        }

        if (op === "-") {
          genExpr(node.expr);
          ir.emit("NEG");
          return;
        }

        if (op === "~") {
          genExpr(node.expr);
          ir.emit("BIT_NOT");
          return;
        }

        if (op === "++") {
          // Pre-increment: ++x => x = x + 1, result is new value
          genExpr(node.expr); // load x
          ir.emit("PUSH_CONST", 1);
          ir.emit("ADD");
          genAssign(node.expr, { kind: "StackValue", inferredType: node.expr.inferredType });
          return;
        }

        if (op === "--") {
          // Pre-decrement: --x => x = x - 1, result is new value
          genExpr(node.expr); // load x
          ir.emit("PUSH_CONST", 1);
          ir.emit("SUB");
          genAssign(node.expr, { kind: "StackValue", inferredType: node.expr.inferredType });
          return;
        }

        cerror(`Unknown unary operator '${op}'`, locOf(node));
      }

      case "PostfixExpr": {
        // Post-increment/decrement: x++, x--
        const op = node.op;
        // Load value first (old value)
        genExpr(node.expr);
        // Duplicate for increment/decrement
        genExpr(node.expr); // load again for modification
        ir.emit("PUSH_CONST", 1);
        if (op === "++") {
          ir.emit("ADD");
        } else {
          ir.emit("SUB");
        }
        genAssign(node.expr, { kind: "StackValue", inferredType: node.expr.inferredType });
        // Old value is already on stack (from first load)
        return;
      }

      case "BinaryExpr": {
        const op = node.op;

        // NOTE: sema computed inferredType on node and its children.
        // We'll emit minimal numeric promotion: int->float via I2F when needed.
        const outT = node.inferredType;
        const lt = node.left.inferredType;
        const rt = node.right.inferredType;

        genExpr(node.left);
        if (isFloatType(outT) && isIntLikeType(lt)) ir.emit("I2F");

        genExpr(node.right);
        if (isFloatType(outT) && isIntLikeType(rt)) ir.emit("I2F");

        // Arithmetic
        if (op === "+") return void ir.emit("ADD");
        if (op === "-") return void ir.emit("SUB");
        if (op === "*") return void ir.emit("MUL");
        if (op === "/") {
          // If float => DIV, else IDIV
          if (isFloatType(outT)) ir.emit("DIV");
          else ir.emit("IDIV");
          return;
        }
        if (op === "%") return void ir.emit("MOD");

        // Comparisons
        if (op === "==") return void ir.emit("EQ");
        if (op === "!=") return void ir.emit("NE");
        if (op === "<") return void ir.emit("LT");
        if (op === "<=") return void ir.emit("LE");
        if (op === ">") return void ir.emit("GT");
        if (op === ">=") return void ir.emit("GE");

        // Logical
        if (op === "&&") return void ir.emit("AND");
        if (op === "||") return void ir.emit("OR");

        // Bitwise ops
        if (op === "&") return void ir.emit("BIT_AND");
        if (op === "|") return void ir.emit("BIT_OR");
        if (op === "^") return void ir.emit("BIT_XOR");
        if (op === "<<") return void ir.emit("SHL");
        if (op === ">>") return void ir.emit("SHR");

        cerror(`Unknown binary operator '${op}'`, locOf(node));
      }

      case "MemberExpr": {
        // node.object, node.field, node.isArrow, node.fieldIndex (from sema)
        if (typeof node.fieldIndex !== "number") {
          cerror("Internal: member access missing fieldIndex (run sema first).", locOf(node));
        }
        if (node.isArrow) {
          genExpr(node.object); // pointer
          ir.emit("LOAD_PTR_FIELD", { offset: node.fieldIndex });
          return;
        }

        // '.' on struct value
        genExpr(node.object); // value
        ir.emit("LOAD_FIELD", { offset: node.fieldIndex });
        return;
      }

      case "IndexExpr": {
        // Generate: array[index] using LOAD_INDEX
        // For pointers, this is pointer arithmetic: *(ptr + index)
        // For arrays, this is array indexing
        genExpr(node.array);
        genExpr(node.index);
        ir.emit("LOAD_INDEX");
        return;
      }

            case "CallExpr": {
        const callee = node.callee;

        if (!callee || callee.kind !== "IdentifierExpr") {
          cerror("Only direct function calls are supported (callee must be identifier).", locOf(node));
        }

        // ---- Special-case: print(x) ----
        if (callee.name === "print") {
          if (node.args.length !== 1) {
            cerror(`print expects 1 argument, got ${node.args.length}`, locOf(node));
          }
          genExpr(node.args[0]);
          ir.emit("PRINT");
          ir.emit("PUSH_CONST", 0);
          return;
        }

        // ================================================================
        // C STANDARD LIBRARY — compile-time lowering layer
        // ================================================================

        // ── printf / fprintf ── compile-time format-string expansion ──────
        if (callee.name === "printf" || callee.name === "fprintf") {
          const fmtIdx = callee.name === "fprintf" ? 1 : 0;
          const fmtNode = node.args[fmtIdx];
          if (fmtNode && fmtNode.kind === "StringLiteralExpr") {
            const raw = fmtNode.value;
            const fmt = _processEscapes(raw);
            let dataIdx = fmtIdx + 1;
            let textBuf = "";

            const flushText = () => {
              if (textBuf) {
                ir.emit("PUSH_CONST", textBuf);
                ir.emit("PRINT_INLINE");
                textBuf = "";
              }
            };

            let i = 0;
            while (i < fmt.length) {
              if (fmt[i] !== "%") { textBuf += fmt[i++]; continue; }
              const specStart = i; // position of %
              i++;
              // capture flags
              let flags = "";
              while (i < fmt.length && "-+ 0#".includes(fmt[i])) flags += fmt[i++];
              // capture width
              let widthStr = "";
              if (i < fmt.length && fmt[i] === "*") { i++; dataIdx++; widthStr = "*"; }
              else while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") widthStr += fmt[i++];
              // capture precision
              let precStr = "";
              if (i < fmt.length && fmt[i] === ".") {
                i++;
                if (i < fmt.length && fmt[i] === "*") { i++; dataIdx++; precStr = ".*"; }
                else { while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") precStr += fmt[i++]; }
              }
              // length modifier
              let lenMod = "";
              while (i < fmt.length && "lhLzqjt".includes(fmt[i])) lenMod += fmt[i++];
              if (i >= fmt.length) break;
              const spec = fmt[i++];
              if (spec === "%") { textBuf += "%"; continue; }
              if (spec === "n") { dataIdx++; continue; }
              flushText();
              if (dataIdx < node.args.length) {
                const fmtSpec = `%${flags}${widthStr}${precStr !== "" ? "." + precStr : ""}${spec}`;
                // Push spec FIRST, then value — VM handler pops: val=pop(), spec=pop()
                ir.emit("PUSH_CONST", fmtSpec);
                genExpr(node.args[dataIdx++]);
                ir.emit("CALL", { name: "__printf_fmt", argc: 2 });
                ir.emit("PRINT_INLINE");
              }
            }
            flushText();
          } else {
            for (const arg of node.args) genExpr(arg);
            ir.emit("CALL", { name: "printf", argc: node.args.length });
          }
          ir.emit("PUSH_CONST", 0); // return value
          return;
        }

        // ── scanf / fscanf ── compile-time format-string reading ──────────
        if (callee.name === "scanf" || callee.name === "fscanf") {
          const fmtIdx = callee.name === "fscanf" ? 1 : 0;
          const fmtNode = node.args[fmtIdx];
          let matched = 0;
          if (fmtNode && fmtNode.kind === "StringLiteralExpr") {
            const raw = fmtNode.value;
            const fmt = _processEscapes(raw);
            let dataIdx = fmtIdx + 1;
            let i = 0;
            while (i < fmt.length) {
              if (fmt[i] !== "%") { i++; continue; }
              i++;
              // skip flags/width
              while (i < fmt.length && "-+ 0#*".includes(fmt[i])) i++;
              while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") i++;
              // skip precision
              if (i < fmt.length && fmt[i] === ".") { i++; while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") i++; }
              // length modifier
              while (i < fmt.length && "lhLzqjt".includes(fmt[i])) i++;
              if (i >= fmt.length) break;
              const spec = fmt[i++];
              if (spec === "%") continue;
              if (dataIdx >= node.args.length) break;
              const ptrArg = node.args[dataIdx++];
              const readFn = (spec === "f" || spec === "g" || spec === "e") ? "readDouble"
                           : (spec === "s") ? "readStringC"
                           : (spec === "c") ? "readCharC"
                           : "readInt"; // d, i, u, o, x, X
              ir.emit("CALL", { name: readFn, argc: 0 });
              // Store result through pointer
              _emitScanfStore(ptrArg);
              matched++;
            }
          }
          ir.emit("PUSH_CONST", matched);
          return;
        }

        // ── putchar(c) ───────────────────────────────────────────────────
        if (callee.name === "putchar" || callee.name === "putc") {
          genExpr(node.args[0]);
          ir.emit("CALL", { name: "putchar", argc: 1 });
          ir.emit("PUSH_CONST", 0);
          return;
        }

        // ── puts(s) ──────────────────────────────────────────────────────
        if (callee.name === "puts") {
          genExpr(node.args[0]);
          ir.emit("PRINT_INLINE");          // print string
          ir.emit("PUSH_CONST", "\n");
          ir.emit("PRINT_INLINE");          // always appends newline
          ir.emit("PUSH_CONST", 0);
          return;
        }

        // ── getchar() ────────────────────────────────────────────────────
        if (callee.name === "getchar") {
          ir.emit("CALL", { name: "getchar", argc: 0 });
          return;
        }

        // ── fflush (no-op for stdout) ────────────────────────────────────
        if (callee.name === "fflush") {
          ir.emit("PUSH_CONST", 0);
          return;
        }

        // ── sprintf(buf, fmt, …) ─────────────────────────────────────────
        if (callee.name === "sprintf" || callee.name === "snprintf") {
          // Treat like printf but store result in buf (simplified: just do printf)
          const fmtIdx = callee.name === "snprintf" ? 2 : 1;
          const fmtNode = node.args[fmtIdx];
          if (fmtNode && fmtNode.kind === "StringLiteralExpr") {
            // Build the output string using the same format logic
            // We call through VM's sprintf builtin instead
            for (const arg of node.args) genExpr(arg);
            ir.emit("CALL", { name: "sprintf", argc: node.args.length });
          } else {
            for (const arg of node.args) genExpr(arg);
            ir.emit("CALL", { name: "sprintf", argc: node.args.length });
          }
          ir.emit("PUSH_CONST", 0);
          return;
        }

        // ── sscanf(str, fmt, …) ──────────────────────────────────────────
        if (callee.name === "sscanf") {
          for (const arg of node.args) genExpr(arg);
          ir.emit("CALL", { name: "sscanf", argc: node.args.length });
          return;
        }

        // ── String functions (strlen, strcmp, strcpy, …) ─────────────────
        const _strFns = new Set(["strlen","strcpy","strncpy","strcat","strncat",
          "strcmp","strncmp","strchr","strstr","strtok","strrev","strtol","strtod"]);
        if (_strFns.has(callee.name)) {
          for (const arg of node.args) genExpr(arg);
          ir.emit("CALL", { name: callee.name, argc: node.args.length });
          return;
        }

        // ── Math functions ────────────────────────────────────────────────
        const _mathFns = { sqrt:"c_sqrt", fabs:"c_fabs", ceil:"c_ceil", floor:"c_floor",
          round:"c_round", pow:"c_pow", log:"c_log", log2:"c_log2", log10:"c_log10",
          exp:"c_exp", sin:"c_sin", cos:"c_cos", tan:"c_tan",
          fmin:"c_fmin", fmax:"c_fmax", fmod:"c_fmod", hypot:"c_hypot", atan2:"c_atan2" };
        if (_mathFns[callee.name]) {
          for (const arg of node.args) genExpr(arg);
          ir.emit("CALL", { name: _mathFns[callee.name], argc: node.args.length });
          return;
        }

        // ── abs, atoi, atof, rand, srand, qsort ──────────────────────────
        const _stdlibFns = { abs:"c_abs", labs:"c_abs", llabs:"c_abs",
          atoi:"atoi", atof:"atof", atol:"atol",
          rand:"c_rand", srand:"c_srand", qsort:"c_qsort",
          calloc:"calloc", realloc:"realloc", memmove:"memmove", abort:"abort" };
        if (_stdlibFns[callee.name]) {
          for (const arg of node.args) genExpr(arg);
          ir.emit("CALL", { name: _stdlibFns[callee.name], argc: node.args.length });
          if (callee.name === "srand" || callee.name === "abort") ir.emit("PUSH_CONST", 0);
          return;
        }

        // ================================================================
        // END C standard library layer — fall through to normal call
        // ================================================================

        const fs = callee.symbol;
        if (!fs || fs.kind !== "func") cerror(`'${callee.name}' is not a function`, locOf(callee));

        // Push args
        for (let i = 0; i < node.args.length; i++) {
          genExpr(node.args[i]);
        }

        // Normal call to user-defined function label
        ir.emit("CALL", { name: fs.name, argc: node.args.length });
        // If the callee returns void, keep expression stack stable by pushing a dummy 0
        // (ExprStmt always POPs the expression result).
        const retT = fs.type && fs.type.kind === "func" ? fs.type.ret : null;
        if (retT && retT.kind === "primitive" && retT.name === "void") {
          ir.emit("PUSH_CONST", 0);
        }
        return;
      }


      case "AssignExpr": {
        // assignment is an expression in our AST
        // Evaluate as: perform store, then leave assigned value on stack (C semantics).
        // VM store ops typically consume value; so we do: (addr/value) store, then reload if needed.
        genAssign(node.target, node.value);
        // reload value as expression result
        genExpr(node.target); // for identifier this clones structs; acceptable for expression result
        return;
      }

      case "CompoundAssignExpr": {
        // x += y  =>  x = x + y
        const op = node.op.slice(0, -1); // Remove '=' to get operator
        genExpr(node.target); // load x
        genExpr(node.value);  // load y
        // Perform operation
        if (op === "+") ir.emit("ADD");
        else if (op === "-") ir.emit("SUB");
        else if (op === "*") ir.emit("MUL");
        else if (op === "/") {
          const lt = node.target.inferredType;
          if (isFloatType(lt)) ir.emit("DIV");
          else ir.emit("IDIV");
        } else if (op === "%") ir.emit("MOD");
        else if (op === "&") ir.emit("BIT_AND");
        else if (op === "|") ir.emit("BIT_OR");
        else if (op === "^") ir.emit("BIT_XOR");
        else if (op === "<<") ir.emit("SHL");
        else if (op === ">>") ir.emit("SHR");
        else cerror(`Unsupported compound assignment operator '${op}'`, locOf(node));
        // Store result back
        genAssign(node.target, { kind: "StackValue", inferredType: node.target.inferredType });
        // Reload for expression result
        genExpr(node.target);
        return;
      }

      case "CastExpr": {
        // Limited: numeric casts only; sema already validated
        const toT = node.inferredType;
        const fromT = node.expr.inferredType;

        genExpr(node.expr);

        // Only implement int->float since VM has I2F
        if (isFloatType(toT) && isIntLikeType(fromT)) {
          ir.emit("I2F");
          return;
        }

        // float->int not supported in VM IR v1
        if (isIntLikeType(toT) && isFloatType(fromT)) {
          cerror("float-to-int cast not supported in IRGen v1.", locOf(node));
        }

        // pointer casts not supported in VM IR v1
        return;
      }

      case "SizeofExpr":
        // CP-grade VM sizing model:
        // - primitives/pointers: 1 "word"
        // - structs: number of fields
        // - arrays: length * sizeof(base)
        //
        // sema attaches the canonical type as node._sizeofType.
        {
          const t = node._sizeofType;
          const sizeofType = (tt) => {
            if (!tt) return 1;
            if (tt.kind === "struct") return structLayout(tt).n;
            if (tt.kind === "array") {
              const len = tt.length == null ? 0 : tt.length;
              return len * sizeofType(tt.base);
            }
            return 1;
          };
          ir.emit("PUSH_CONST", sizeofType(t));
          return;
        }

      case "TernaryExpr": {
        // condition ? thenExpr : elseExpr
        genExpr(node.condition);
        const jf = ir.emit("JUMP_IF_FALSE", null);
        genExpr(node.thenExpr);
        const jend = ir.emit("JUMP", null);
        const elsePos = ir.instructions.length;
        ir.patch(jf, elsePos);
        genExpr(node.elseExpr);
        const endPos = ir.instructions.length;
        ir.patch(jend, endPos);
        return;
      }

      case "CommaExpr": {
        // Evaluate left (side effects), then right (result)
        genExpr(node.left);
        ir.emit("POP"); // discard left result
        genExpr(node.right);
        return;
      }

      case "InitializerList": {
        // For arrays, we'll generate code to initialize each element
        // This is a simplified version - in reality we'd need to handle array storage
        // For now, just push the first element (simplified)
        if (node.elements.length > 0) {
          genExpr(node.elements[0]);
        } else {
          ir.emit("PUSH_CONST", 0);
        }
        return;
      }

      default:
        cerror(`Unknown expression kind '${node.kind}'`, locOf(node));
    }
  }

  // ----------------------------
  // Address-of lvalues (subset)
  // ----------------------------
  function genAddrOfLValue(expr) {
    if (!expr) cerror("Internal: missing lvalue", null);

    // Identifier => &var
    if (expr.kind === "IdentifierExpr") {
      ir.emit("ADDR_VAR", expr.name);
      return;
    }

    // *p => address is p
    if (expr.kind === "UnaryExpr" && expr.op === "*") {
      genExpr(expr.expr); // pointer value
      return;
    }

    // member access => take base address + field
    if (expr.kind === "MemberExpr") {
      if (typeof expr.fieldIndex !== "number") {
        cerror("Internal: member lvalue missing fieldIndex.", locOf(expr));
      }

      if (expr.isArrow) {
        genExpr(expr.object);          // pointer to aggregate
        ir.emit("ADDR_PTR_FIELD", expr.fieldIndex);
        return;
      }

      // '.' case: need address of base struct object
      // We can take address of base if it's an lvalue itself:
      //   &(s.f) where s is identifier or *ptr or ptr->field etc.
      genAddrOfLValue(expr.object);
      ir.emit("ADDR_PTR_FIELD", expr.fieldIndex);
      return;
    }

    cerror("Address-of requires an addressable lvalue in this subset.", locOf(expr));
  }

  // ----------------------------
  // Assignment lowering
  // ----------------------------
  function genAssign(target, value) {
    if (!target) cerror("Internal: assignment missing target", null);

    // Handle stack value (for compound assignment)
    if (value && value.kind === "StackValue") {
      // Value is already on stack, just store it
      if (target.kind === "IdentifierExpr") {
        const sym = target.symbol || globals.get(target.name);
        if (sym && sym.kind === "var" && isStructType(sym.type)) {
          ir.emit("CLONE_STRUCT");
        }
        ir.emit("STORE", target.name);
        return;
      }
      // For other targets, we'd need to handle them similarly
      cerror("Compound assignment to non-identifier not supported", locOf(target));
      return;
    }

    // x = v
    if (target.kind === "IdentifierExpr") {
      genExpr(value);

      // If target is struct, enforce value semantics by cloning before storing.
      const sym = target.symbol || globals.get(target.name);
      if (sym && sym.kind === "var" && isStructType(sym.type)) {
        ir.emit("CLONE_STRUCT");
      }

      ir.emit("STORE", target.name);
      return;
    }

    // *p = v
    if (target.kind === "UnaryExpr" && target.op === "*") {
      // Stack order required: [ptr, value] then STORE_PTR
      genExpr(target.expr); // ptr
      genExpr(value);
      ir.emit("STORE_PTR");
      return;
    }

    // s.field = v  OR  p->field = v
    if (target.kind === "MemberExpr") {
      if (typeof target.fieldIndex !== "number") {
        cerror("Internal: assignment member target missing fieldIndex.", locOf(target));
      }

      // For STORE_FIELD / STORE_PTR_FIELD, VM expects [base, value]
      if (target.isArrow) {
        genExpr(target.object); // pointer
        genExpr(value);
        ir.emit("STORE_PTR_FIELD", { offset: target.fieldIndex });
        return;
      }

      // '.' store: base must be struct value object
      // IMPORTANT: we must NOT CLONE base here; we want to mutate the original object.
      // If base is an identifier, load without cloning by using LOAD directly:
      if (target.object.kind === "IdentifierExpr") {
        ir.emit("LOAD", target.object.name);
      } else {
        // If base is more complex, we evaluate it (may clone inside IdentifierExpr),
        // which can accidentally store into a temporary. We disallow for v1.
        cerror("Assignment to fields is only supported when base is a variable (e.g., s.field = ...).", locOf(target));
      }

      genExpr(value);
      ir.emit("STORE_FIELD", { offset: target.fieldIndex });
      return;
    }

    // a[i] = v  OR  *(ptr + i) = v
    if (target.kind === "IndexExpr") {
      // STORE_INDEX expects [array/ptr, index, value] on stack
      genExpr(target.array);
      genExpr(target.index);
      genExpr(value);
      ir.emit("STORE_INDEX");
      return;
    }

    cerror("Unsupported assignment target in IRGen v1.", locOf(target));
  }

  // ----------------------------
  // Statements
  // ----------------------------
  function genStmt(node) {
    if (!node) return;

    switch (node.kind) {
      case "BlockStmt": {
        let terminated = false;
        for (const item of node.items) {
          if (terminated) cerror("Unreachable statement after return.", locOf(item));
          if (item.kind === "VarDecl") genVarDecl(item);
          else genStmt(item);
          if (stmtAlwaysTerminates(item)) terminated = true;
        }
        return;
      }

      case "ExprStmt":
        genExpr(node.expr);
        ir.emit("POP");
        return;

      case "IfStmt": {
        genExpr(node.test);
        const jf = ir.emit("JUMP_IF_FALSE", null);
        genStmt(node.thenBranch);
        if (node.elseBranch) {
          const jend = ir.emit("JUMP", null);
          ir.patch(jf, ir.instructions.length);
          genStmt(node.elseBranch);
          ir.patch(jend, ir.instructions.length);
        } else {
          ir.patch(jf, ir.instructions.length);
        }
        return;
      }

      case "WhileStmt": {
        const start = ir.instructions.length;
        const breakPatches = [];
        const continuePatches = [];
        
        loopStack.push({ breakPatches, continuePatches });
        
        genExpr(node.test);
        const jf = ir.emit("JUMP_IF_FALSE", null);
        genStmt(node.body);
        ir.emit("JUMP", start);
        const endPos = ir.instructions.length;
        ir.patch(jf, endPos);
        
        // Patch all break and continue jumps
        const loopInfo = loopStack.pop();
        for (const patchIdx of loopInfo.breakPatches) {
          ir.patch(patchIdx, endPos);
        }
        for (const patchIdx of loopInfo.continuePatches) {
          ir.patch(patchIdx, start);
        }
        return;
      }

      case "ForStmt": {
        // init
        if (node.init) {
          if (node.init.kind === "VarDecl") genVarDecl(node.init);
          else genStmt(node.init); // ExprStmt
        }

        const start = ir.instructions.length;
        const breakPatches = [];
        const continuePatches = [];
        
        loopStack.push({ breakPatches, continuePatches });

        // test
        if (node.test) {
          genExpr(node.test);
        } else {
          // for(;;) => true
          ir.emit("PUSH_CONST", 1);
        }

        const jf = ir.emit("JUMP_IF_FALSE", null);

        genStmt(node.body);

        // update (continue jumps here)
        const updatePos = ir.instructions.length;
        if (node.update) {
          genExpr(node.update);
          ir.emit("POP");
        }

        ir.emit("JUMP", start);
        const endPos = ir.instructions.length;
        ir.patch(jf, endPos);
        
        // Patch all break and continue jumps
        const loopInfo = loopStack.pop();
        for (const patchIdx of loopInfo.breakPatches) {
          ir.patch(patchIdx, endPos);
        }
        for (const patchIdx of loopInfo.continuePatches) {
          ir.patch(patchIdx, updatePos);
        }
        return;
      }

      case "SwitchStmt": {
        const breakPatches = [];
        loopStack.push({ breakPatches, continuePatches: [] });
        
        // Evaluate test once and store in a temporary (we'll duplicate it for each case)
        genExpr(node.test);
        
        const caseLabels = [];
        const caseJumps = [];
        
        // Generate case comparisons
        for (const caseItem of node.cases) {
          const caseStart = ir.instructions.length;
          caseLabels.push(caseStart);
          
          // Compare test with case value
          // We need to duplicate test value, but VM doesn't have DUP
          // So we'll reload test for each comparison (inefficient but works)
          genExpr(node.test);
          genExpr(caseItem.value);
          ir.emit("EQ");
          const jumpToNext = ir.emit("JUMP_IF_FALSE", null);
          caseJumps.push(jumpToNext);
          
          // Generate case body
          for (const caseStmt of caseItem.body) {
            genStmt(caseStmt);
          }
        }
        
        // Default case
        const defaultStart = node.defaultCase ? ir.instructions.length : null;
        if (node.defaultCase) {
          for (const defaultStmt of node.defaultCase) {
            genStmt(defaultStmt);
          }
        }
        
        const endPos = ir.instructions.length;
        
        // Patch case jumps: if test doesn't match, jump to next case or default or end
        for (let i = 0; i < caseJumps.length; i++) {
          const nextTarget = i < caseLabels.length - 1 
            ? caseLabels[i + 1] 
            : (defaultStart !== null ? defaultStart : endPos);
          ir.patch(caseJumps[i], nextTarget);
        }
        
        // Patch break statements
        const loopInfo = loopStack.pop();
        for (const patchIdx of loopInfo.breakPatches) {
          ir.patch(patchIdx, endPos);
        }
        
        return;
      }

      case "DoWhileStmt": {
        const breakPatches = [];
        const continuePatches = [];
        loopStack.push({ breakPatches, continuePatches });
        
        const start = ir.instructions.length;
        genStmt(node.body);
        const continuePos = ir.instructions.length;
        
        genExpr(node.test);
        ir.emit("JUMP_IF_FALSE", null);
        const jf = ir.instructions.length - 1;
        
        ir.emit("JUMP", start);
        const endPos = ir.instructions.length;
        ir.patch(jf, endPos);
        
        // Patch break and continue
        const loopInfo = loopStack.pop();
        for (const patchIdx of loopInfo.breakPatches) {
          ir.patch(patchIdx, endPos);
        }
        for (const patchIdx of loopInfo.continuePatches) {
          ir.patch(patchIdx, continuePos);
        }
        return;
      }

      case "GotoStmt": {
        const label = node.label;
        const jumpIdx = ir.emit("JUMP", null);
        if (!pendingGotos || !labelAddrs) {
          cerror("Internal: goto used outside function context", locOf(node));
        }
        if (labelAddrs.has(label)) {
          ir.patch(jumpIdx, labelAddrs.get(label));
        } else {
          const arr = pendingGotos.get(label) || [];
          arr.push(jumpIdx);
          pendingGotos.set(label, arr);
        }
        return;
      }

      case "LabelStmt": {
        const label = node.label;
        if (!pendingGotos || !labelAddrs) {
          cerror("Internal: label used outside function context", locOf(node));
        }
        const labelPos = ir.instructions.length;
        labelAddrs.set(label, labelPos);
        const pend = pendingGotos.get(label);
        if (pend && pend.length) {
          for (const j of pend) ir.patch(j, labelPos);
          pendingGotos.delete(label);
        }
        genStmt(node.stmt);
        return;
      }

      case "ReturnStmt":
        if (node.value) {
          genExpr(node.value);
          ir.emit("RETURN_VAL");
        } else {
          ir.emit("RETURN");
        }
        return;

      case "BreakStmt": {
        if (loopStack.length === 0) {
          cerror("'break' not within a loop", locOf(node));
        }
        const loopInfo = loopStack[loopStack.length - 1];
        const jumpIdx = ir.emit("JUMP", null);
        loopInfo.breakPatches.push(jumpIdx);
        return;
      }
      
      case "ContinueStmt": {
        if (loopStack.length === 0) {
          cerror("'continue' not within a loop", locOf(node));
        }
        const loopInfo = loopStack[loopStack.length - 1];
        const jumpIdx = ir.emit("JUMP", null);
        loopInfo.continuePatches.push(jumpIdx);
        return;
      }

      default:
        cerror(`Unknown statement kind '${node.kind}'`, locOf(node));
    }
  }

  // ----------------------------
  // Variable declarations (locals)
  // ----------------------------
  function genVarDecl(vd) {
    const sym = vd.symbol;
    if (!sym || sym.kind !== "var") cerror("Internal: VarDecl missing symbol", locOf(vd));

    // Arrays: represent as JS arrays in the VM so LOAD_INDEX/STORE_INDEX work.
    // We default-initialize to 0s to avoid undefined reads (consistent with existing v1 behavior).
    if (sym.type && sym.type.kind === "array") {
      const declaredLen = sym.type.length;
      const initList = vd.init && vd.init.kind === "InitializerList" ? vd.init : null;
      const len =
        declaredLen != null
          ? declaredLen
          : (initList ? initList.elements.length : 0);

      const arr = Array(len).fill(0);
      if (vd.init) {
        if (!initList) {
          cerror("Array initializer must be a brace initializer list in this subset.", locOf(vd.init));
        }

        const n = Math.min(len, initList.elements.length);
        for (let i = 0; i < n; i++) {
          const el = initList.elements[i];
          // CP-grade subset: support constant integer elements only.
          if (el.kind === "IntLiteralExpr") {
            arr[i] = Number(el.value);
            continue;
          }
          if (el.kind === "UnaryExpr" && el.op === "-" && el.expr && el.expr.kind === "IntLiteralExpr") {
            arr[i] = -Number(el.expr.value);
            continue;
          }
          cerror("Non-constant array initializer element not supported in v1.", locOf(el));
        }
      }

      ir.emit("PUSH_CONST", arr);
      ir.emit("STORE", vd.name);
      return;
    }

    // C local variables: we initialize to 0 / null / empty struct to avoid undefined VM reads.
    if (vd.init) {
      genExpr(vd.init);

      if (isStructType(sym.type)) {
        // Ensure value semantics by cloning before storing
        ir.emit("CLONE_STRUCT");
      }

      ir.emit("STORE", vd.name);
      return;
    }

    // No initializer => default init
    if (isStructType(sym.type)) {
      const L = structLayout(sym.type);
      ir.emit("ALLOC_STRUCT", { name: L.name, n: L.n });
      ir.emit("STORE", vd.name);
      return;
    }

    // primitives + pointers default to 0
    ir.emit("PUSH_CONST", 0);
    ir.emit("STORE", vd.name);
  }

  // ----------------------------
  // Emit each function body
  // ----------------------------
  for (const fn of funcDecls) {
    ir.emit("FUNC_LABEL", fn.name);
    // Reset per-function state
    labelAddrs = new Map();
    pendingGotos = new Map();

    // Bind args into param variable names: $arg0 -> param0, etc.
    for (let i = 0; i < fn.params.length; i++) {
      ir.emit("LOAD", `$arg${i}`);
      ir.emit("STORE", fn.params[i].name);
    }

    // Function body
    genStmt(fn.body);

    // If control reaches end: implicit return
    // If return type non-void, return 0 (C-style)
    const fs = fn.symbol;
    const retT = fs && fs.type && fs.type.kind === "func" ? fs.type.ret : null;
    if (retT && retT.kind === "primitive" && retT.name === "void") {
      ir.emit("RETURN");
    } else {
      ir.emit("PUSH_CONST", 0);
      ir.emit("RETURN_VAL");
    }

    // Any unresolved gotos are an error
    if (pendingGotos && pendingGotos.size > 0) {
      const missing = Array.from(pendingGotos.keys()).join(", ");
      cerror(`Undefined label(s): ${missing}`, locOf(fn));
    }
  }

  // Patch entry jump to start of main
  // We jump to label "main" via CALL, but older codegen conventions jump into main body.
  // Here we build a tiny entry stub that calls main and halts via RETURN.
  const entryLabelIndex = ir.instructions.length;

  // entry stub:
  //   <global init>
  //   CALL main 0
  //   RETURN

  // Emit enum constants as globals so runtime can LOAD_VAR them (e.g., M2).
  // (Enums aren't VarDecls in the AST, so without this they'd be missing at runtime.)
  for (const [name, sym] of globals) {
    if (sym && sym.kind === "var" && sym.isEnumValue) {
      const v = (typeof sym.enumValue === "number" && Number.isFinite(sym.enumValue)) ? sym.enumValue : 0;
      ir.emit("PUSH_CONST", v);
      ir.emit("STORE", name);
    }
  }

  ir.emit("CALL", { name: "main", argc: 0 });
  ir.emit("POP");   // discard return value if any
  ir.emit("RETURN");

  ir.patch(entryJump, entryLabelIndex);

  // NOTE: Global initializers are not emitted in this subset.
  // If you want global init, we can emit it in the entry stub before calling main.

  return ir;
}

module.exports = generateIR;
