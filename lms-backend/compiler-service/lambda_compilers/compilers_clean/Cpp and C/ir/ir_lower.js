// ir/ir_lower.js
// v0.8: adds vtables + indirect calls lowering
//
// IR ops added:
//   DEF_VTABLE  (arg: {className, baseName, slots:[funcName...], dtorFuncName?, dtorAddr?})
//   LOAD_VTABLE (no arg)
//   LOAD_VFUNC  (arg: slot number OR {slot})
//   CALL_INDIRECT (arg: argc number OR {argc})
//
// Existing v0.7 ops preserved.

function lowerIR(ir) {
  const bytecode = [];
  const functionTable = new Map(); // funcName -> bytecode address
  const addrMap = new Map();       // IR index -> bytecode index

  // --- helpers
  const unwrapOffset = (arg) => {
    if (arg == null) return arg;
    if (typeof arg === "number") return arg;
    if (typeof arg === "object" && typeof arg.offset === "number") return arg.offset;
    return arg; // leave as-is; VM has a fallback check too
  };

  const unwrapAlloc = (arg) => {
    if (arg == null) return { name: null, n: 0 };
    if (typeof arg === "string") return { name: arg, n: 0 };
    if (typeof arg === "object") {
      const name = arg.name ?? arg.className ?? arg.structName ?? null;
      const n = arg.n ?? arg.fields ?? arg.size ?? 0;
      return { name, n };
    }
    return { name: null, n: 0 };
  };

  const unwrapAllocObject = (arg) => {
    // v0.7 ALLOC_OBJECT expects { kind: "struct"|"class", name: string, n: number }
    if (arg && typeof arg === "object") {
      const kind = arg.kind ?? arg.type ?? null;
      const name = arg.name ?? arg.className ?? arg.structName ?? null;
      const n = arg.n ?? arg.fields ?? arg.size ?? 0;
      return { kind, name, n };
    }
    return { kind: null, name: null, n: 0 };
  };

  const unwrapCall = (arg) => {
    // CALL expects { name, argc } or [name, argc]
    if (Array.isArray(arg)) return { name: arg[0], argc: arg[1] };
    if (arg && typeof arg === "object") return { name: arg.name, argc: arg.argc ?? 0 };
    return { name: null, argc: 0 };
  };

  const unwrapCallMethod = (arg) => {
    // CALL_METHOD expects { className, methodName, argc }
    if (arg && typeof arg === "object") {
      return { className: arg.className ?? null, methodName: arg.methodName ?? null, argc: arg.argc ?? 0 };
    }
    return { className: null, methodName: null, argc: 0 };
  };

  const unwrapDefMethod = (arg) => {
    if (arg && typeof arg === "object") {
      return { className: arg.className ?? null, methodName: arg.methodName ?? null, funcName: arg.funcName ?? null };
    }
    return { className: null, methodName: null, funcName: null };
  };

  const unwrapDefVTable = (arg) => {
    if (arg && typeof arg === "object") {
      return {
        className: arg.className ?? null,
        baseName: arg.baseName ?? null,
        slots: Array.isArray(arg.slots) ? arg.slots : [],
        dtorFuncName: arg.dtorFuncName ?? null,
      };
    }
    return { className: null, baseName: null, slots: [], dtorFuncName: null };
  };

  const unwrapSlot = (arg) => {
    if (typeof arg === "number") return arg;
    if (arg && typeof arg === "object" && typeof arg.slot === "number") return arg.slot;
    return arg;
  };

  const unwrapArgc = (arg) => {
    if (typeof arg === "number") return arg;
    if (arg && typeof arg === "object" && typeof arg.argc === "number") return arg.argc;
    return arg;
  };

  // --- PASS 1: resolve function labels to bytecode addresses
  for (let i = 0; i < ir.instructions.length; i++) {
    addrMap.set(i, bytecode.length);
    const { op, arg } = ir.instructions[i];
    if (op === "FUNC_LABEL") {
      functionTable.set(arg, bytecode.length);
    } else {
      // placeholder so addrMap matches instruction indices
      bytecode.push(["NOP"]);
    }
  }

  // remove placeholders; we will re-emit PASS 2 into a fresh bytecode
  const placeholders = bytecode.length;
  bytecode.length = 0;

  const resolveFuncAddr = (name) => {
    // VM-level builtins are resolved by name at runtime when addr is undefined.
    const builtins = ["len", "input", "print", "exit", "malloc", "free", "memset", "memcpy", 
                      "readInt", "readLong", "readDouble", "writeInt", "writeLong", "writeDouble", 
                      "writeChar", "writeString", "newline",
                      // C standard library builtins
                      "printf", "fprintf", "sprintf", "snprintf", "sscanf",
                      "putchar", "getchar", "puts",
                      "strlen", "strcpy", "strncpy", "strcat", "strncat",
                      "strcmp", "strncmp", "strchr", "strstr", "strtok", "strrev", "strtol", "strtod",
                      "atoi", "atof", "atol",
                      "c_abs", "c_rand", "c_srand", "c_qsort",
                      "calloc", "realloc", "memmove", "abort",
                      "readStringC", "readCharC",
                      "__printf_fmt",
                      "c_sqrt", "c_fabs", "c_ceil", "c_floor", "c_round", "c_pow",
                      "c_log", "c_log2", "c_log10", "c_exp",
                      "c_sin", "c_cos", "c_tan",
                      "c_fmin", "c_fmax", "c_fmod", "c_hypot", "c_atan2"];
    if (builtins.includes(name)) return undefined;
    const addr = functionTable.get(name);
    if (addr == null) throw new Error(`Unknown function label '${name}'`);
    return addr;
  };

  // --- PASS 2: emit bytecode
  for (let i = 0; i < ir.instructions.length; i++) {
    const { op, arg } = ir.instructions[i];

    switch (op) {
      case "FUNC_LABEL":
        break;

      case "PUSH_CONST":
        bytecode.push(["LOAD_CONST", arg]);
        break;

      case "LOAD":
      case "LOAD_VAR":
        bytecode.push(["LOAD_VAR", arg]);
        break;

      case "STORE":
      case "STORE_VAR":
        bytecode.push(["STORE_VAR", arg]);
        break;

      case "ADDR_VAR":
        bytecode.push(["ADDR_VAR", arg]);
        break;

      case "ADDR_PTR_FIELD":
        bytecode.push(["ADDR_PTR_FIELD", arg]);
        break;

      case "STORE_PTR":
        bytecode.push(["STORE_PTR"]);
        break;

      case "POP":
        bytecode.push(["POP"]);
        break;

      case "I2F":
        bytecode.push(["I2F"]);
        break;
      case "F2I":
        bytecode.push(["F2I"]);
        break;

      case "ADD": bytecode.push(["ADD"]); break;
      case "SUB": bytecode.push(["SUB"]); break;
      case "MUL": bytecode.push(["MUL"]); break;
      case "DIV": bytecode.push(["DIV"]); break;
      case "IDIV": bytecode.push(["IDIV"]); break;
      case "MOD": bytecode.push(["MOD"]); break;
      case "NEG": bytecode.push(["NEG"]); break;

      case "EQ": bytecode.push(["COMPARE_EQ"]); break;
      case "NE": bytecode.push(["COMPARE_NE"]); break;
      case "LT": bytecode.push(["COMPARE_LT"]); break;
      case "GT": bytecode.push(["COMPARE_GT"]); break;
      case "LE": bytecode.push(["COMPARE_LE"]); break;
      case "GE": bytecode.push(["COMPARE_GE"]); break;

      case "AND": bytecode.push(["AND"]); break;
      case "OR":  bytecode.push(["OR"]); break;
      case "NOT": bytecode.push(["NOT"]); break;

      case "BIT_AND": bytecode.push(["BIT_AND"]); break;
      case "BIT_OR":  bytecode.push(["BIT_OR"]); break;
      case "BIT_XOR": bytecode.push(["BIT_XOR"]); break;
      case "BIT_NOT": bytecode.push(["BIT_NOT"]); break;
      case "SHL": bytecode.push(["SHL"]); break;
      case "SHR": bytecode.push(["SHR"]); break;

      // ---- exceptions (v0.9) ----
      case "PUSH_HANDLER": {
        // arg: { catchTarget, catchType, catchVar }
        const info = arg || {};
        const catchTarget = info.catchTarget;
        if (typeof catchTarget !== "number") {
          throw new Error("PUSH_HANDLER missing catchTarget");
        }
        bytecode.push([
          "PUSH_HANDLER",
          {
            catchAddr: addrMap.get(catchTarget),
            catchType: info.catchType ?? null,
            catchVar: info.catchVar ?? null,
          },
        ]);
        break;
      }

      case "POP_HANDLER":
        bytecode.push(["POP_HANDLER"]);
        break;

      case "THROW":
        bytecode.push(["THROW"]);
        break;

      case "RETHROW":
        bytecode.push(["RETHROW"]);
        break;

      case "ENTER_CATCH":
        bytecode.push(["ENTER_CATCH"]);
        break;

      case "LEAVE_CATCH":
        bytecode.push(["LEAVE_CATCH"]);
        break;

      case "REGISTER_DTOR":
        bytecode.push(["REGISTER_DTOR", arg]);
        break;

      case "JUMP":
        bytecode.push(["JUMP", addrMap.get(arg)]);
        break;

      case "JUMP_IF_FALSE":
        bytecode.push(["JUMP_IF_FALSE", addrMap.get(arg)]);
        break;

      case "PRINT":
        bytecode.push(["PRINT"]);
        break;

      case "PRINT_INLINE":
        bytecode.push(["PRINT_INLINE"]);
        break;

      case "BUILD_LIST":
        bytecode.push(["BUILD_LIST", arg]);
        break;

      case "LOAD_INDEX":
        bytecode.push(["LOAD_INDEX"]);
        break;

      case "STORE_INDEX":
        bytecode.push(["STORE_INDEX"]);
        break;

      case "SLICE":
        bytecode.push(["SLICE"]);
        break;

      case "ALLOC_STRUCT": {
        const { name, n } = unwrapAlloc(arg);
        bytecode.push(["ALLOC_STRUCT", name, n]);
        break;
      }

      case "CLONE_STRUCT":
        bytecode.push(["CLONE_STRUCT"]);
        break;

      case "LOAD_FIELD":
        bytecode.push(["LOAD_FIELD", unwrapOffset(arg)]);
        break;

      case "STORE_FIELD":
        bytecode.push(["STORE_FIELD", unwrapOffset(arg)]);
        break;

      case "ALLOC_OBJ": {
        const { name, n } = unwrapAlloc(arg);
        bytecode.push(["ALLOC_OBJ", { className: name, n }]);
        break;
      }

      // v0.7 heap pointers
      case "ALLOC_OBJECT": {
        const { kind, name, n } = unwrapAllocObject(arg);
        bytecode.push(["ALLOC_OBJECT", { kind, name, n }]);
        break;
      }
      case "FREE_OBJECT":
        bytecode.push(["FREE_OBJECT"]);
        break;
      case "LOAD_PTR":
        bytecode.push(["LOAD_PTR"]);
        break;
      case "LOAD_PTR_FIELD":
        bytecode.push(["LOAD_PTR_FIELD", unwrapOffset(arg)]);
        break;
      case "STORE_PTR_FIELD":
        bytecode.push(["STORE_PTR_FIELD", unwrapOffset(arg)]);
        break;

      
      case "LOAD_FUNC_ADDR": {
        const name = arg;
        bytecode.push(["LOAD_CONST", resolveFuncAddr(name)]);
        break;
      }

case "CALL": {
        const { name, argc } = unwrapCall(arg);
        bytecode.push(["CALL", resolveFuncAddr(name), argc, name]);
        break;
      }

      case "DEF_METHOD": {
        const { className, methodName, funcName } = unwrapDefMethod(arg);
        // Special marker for runtime-provided methods
        if (funcName === "__RUNTIME__" || funcName === null) {
          bytecode.push(["DEF_METHOD", className, methodName, "__RUNTIME__"]);
        } else {
          bytecode.push(["DEF_METHOD", className, methodName, resolveFuncAddr(funcName)]);
        }
        break;
      }

      case "CALL_METHOD": {
        const { className, methodName, argc } = unwrapCallMethod(arg);
        bytecode.push(["CALL_METHOD", className, methodName, argc]);
        break;
      }

      // --------------------------
      // v0.8 vtables + indirect call
      // --------------------------
      case "DEF_VTABLE": {
        const info = unwrapDefVTable(arg);
        const slotAddrs = info.slots.map((fn) => resolveFuncAddr(fn));
        let dtorAddr = null;
        if (info.dtorFuncName) dtorAddr = resolveFuncAddr(info.dtorFuncName);

        bytecode.push([
          "DEF_VTABLE",
          {
            className: info.className,
            baseName: info.baseName,
            slots: info.slots,
            slotAddrs,
            dtorFuncName: info.dtorFuncName,
            dtorAddr,
          },
        ]);
        break;
      }

      case "LOAD_VTABLE":
        bytecode.push(["LOAD_VTABLE"]);
        break;

      case "LOAD_VFUNC": {
        const slot = unwrapSlot(arg);
        bytecode.push(["LOAD_VFUNC", slot]);
        break;
      }

      case "CALL_INDIRECT": {
        const argc = unwrapArgc(arg);
        bytecode.push(["CALL_INDIRECT", argc]);
        break;
      }

      // --------------------------
      // returns/halt
      // --------------------------
      case "RETURN":
        bytecode.push(["RETURN"]);
        break;

      case "RETURN_VAL":
        bytecode.push(["RETURN_VAL"]);
        break;

      case "HALT":
        bytecode.push(["HALT"]);
        break;

      
case "STR_LEN":
  bytecode.push(["STR_LEN"]);
  break;

case "STR_APPEND_CHAR":
  bytecode.push(["STR_APPEND_CHAR"]);
  break;
default:
        throw new Error(`Unknown IR op '${op}'`);
    }
  }

  return bytecode;
}

module.exports = lowerIR;
