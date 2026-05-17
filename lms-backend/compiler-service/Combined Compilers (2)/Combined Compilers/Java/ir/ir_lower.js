// compiler/ir/ir_lower.js
function lowerIR(ir) {
  const bytecode = [];
  const addrMap = new Map();        // IR index -> bytecode index
  const functionTable = new Map();  // function name -> bytecode index
const labelMap = new Map();   // label name -> IR index

  /* ---------- PASS 1: build address map ---------- */
 let bcIndex = 0;
for (let i = 0; i < ir.instructions.length; i++) {
  const instr = ir.instructions[i];

  if (instr.op === "FUNC_LABEL") {
    addrMap.set(i, bcIndex);
    functionTable.set(instr.arg, bcIndex);
    labelMap.set(instr.arg, i);
    continue;
  }

  if (instr.op === "LABEL") {
    addrMap.set(i, bcIndex);
    labelMap.set(instr.arg, i);
    continue;
  }

  addrMap.set(i, bcIndex);
  bcIndex++;
}


  /* ---------- PASS 2: emit bytecode ---------- */
  for (let i = 0; i < ir.instructions.length; i++) {
    const instr = ir.instructions[i];
    const { op, arg } = instr;

    switch (op) {

      /* ===== LABELS ===== */
      case "LABEL":
        // compile-time only (no bytecode)
        break;

      case "FUNC_LABEL":
        // runtime-visible label
        bytecode.push({ op: "LABEL", arg });
        break;

      /* ===== v1.4 BITWISE ===== */
      case "BIT_AND": bytecode.push({ op: "BIT_AND" }); break;
      case "BIT_OR":  bytecode.push({ op: "BIT_OR" });  break;
      case "BIT_XOR": bytecode.push({ op: "BIT_XOR" }); break;
      case "BIT_NOT": bytecode.push({ op: "BIT_NOT" }); break;
      case "SHL":     bytecode.push({ op: "SHL" });     break;
      case "SHR":     bytecode.push({ op: "SHR" });     break;

      /* ----- CONSTANTS & VARIABLES ----- */
      case "LOAD_CONST": bytecode.push({ op: "LOAD_CONST", arg }); break;
      case "LOAD_VAR":   bytecode.push({ op: "LOAD_VAR", arg }); break;
      case "STORE_VAR":  bytecode.push({ op: "STORE_VAR", arg }); break;

      /* ----- ARITHMETIC ----- */
      case "ADD": bytecode.push({ op: "ADD" }); break;
      case "SUB": bytecode.push({ op: "SUB" }); break;
      case "MUL": bytecode.push({ op: "MUL" }); break;
      case "DIV": bytecode.push({ op: "DIV" }); break;
      case "MOD": bytecode.push({ op: "MOD" }); break;

      /* ----- COMPARISONS ----- */
      case "GT": bytecode.push({ op: "GT" }); break;
      case "LT": bytecode.push({ op: "LT" }); break;
      case "GE": bytecode.push({ op: "GE" }); break;
      case "LE": bytecode.push({ op: "LE" }); break;
      case "EQ": bytecode.push({ op: "EQ" }); break;
      case "NE": bytecode.push({ op: "NE" }); break;

      /* ----- STACK FRAMES ----- */
      case "ENTER": bytecode.push({ op: "ENTER", arg }); break;
      case "RETURN_VAL": bytecode.push({ op: "RETURN_VAL" }); break;

      /* ----- CONTROL FLOW ----- */
      case "JUMP": {
  const targetIR =
    typeof arg === "string" ? labelMap.get(arg) : arg;
  bytecode.push({ op: "JUMP", arg: addrMap.get(targetIR) });
  break;
}

case "JUMP_IF_FALSE": {
  const targetIR =
    typeof arg === "string" ? labelMap.get(arg) : arg;
  bytecode.push({ op: "JUMP_IF_FALSE", arg: addrMap.get(targetIR) });
  break;
}

      /* ----- STRINGS ----- */
      case "STRING_CONCAT": bytecode.push({ op: "STRING_CONCAT" }); break;
      case "STRING_EQUALS": bytecode.push({ op: "STRING_EQUALS" }); break;

      /* ----- ARRAYS ----- */
      case "NEW_ARRAY":    bytecode.push({ op: "NEW_ARRAY" }); break;
      case "ARRAY_GET":    bytecode.push({ op: "ARRAY_GET" }); break;
      case "ARRAY_SET":    bytecode.push({ op: "ARRAY_SET" }); break;
      case "ARRAY_LENGTH": bytecode.push({ op: "ARRAY_LENGTH" }); break;

      /* ----- IO ----- */
      case "PRINT": bytecode.push({ op: "PRINT" }); break;
      case "HALT":  bytecode.push({ op: "HALT" });  break;
/* ===== v1.9 RUNTIME ERRORS ===== */
case "ASSERT":
  bytecode.push({ op: "ASSERT" });
  break;

case "REQUIRE":
  bytecode.push({ op: "REQUIRE" });
  break;

case "ENSURE":
  bytecode.push({ op: "ENSURE" });
  break;

case "CHECK":
  bytecode.push({ op: "CHECK" });
  break;

case "TRAP":
  bytecode.push({ op: "TRAP" });
  break;

  case "NEW_OBJECT":
  bytecode.push({ op: "NEW_OBJECT", arg });
  break;

  case "LOAD_THIS":
    bytecode.push({ op: "LOAD_THIS" });
    break;

    // ir/ir_lower.js (add DUP to switch)
case "DUP": bytecode.push({ op: "DUP" }); break;

  /* ----- CALLS ----- */
case "CALL":
  bytecode.push({
    op: "CALL",
    arg: { name: arg.name, argc: arg.argc }
  });
  break;

/* ===== CONSTRUCTORS (v2.0) ===== */
case "CALL_CONSTRUCTOR":
  bytecode.push({
    op: "CALL",
     arg: { name: `ctor_${arg.className}`, argc: arg.argc }
  });
  break;

case "LOAD_STATIC":
  bytecode.push({ op: "LOAD_STATIC", arg }); // arg = {class, field}
  break;

case "STORE_STATIC":
  bytecode.push({ op: "STORE_STATIC", arg });
  break;
   
  case "LOAD_FIELD":
  bytecode.push({ op: "LOAD_FIELD", arg });
  break;

case "STORE_FIELD":
  bytecode.push({ op: "STORE_FIELD", arg });
  break;

/* ===== v4.0 OBJECT METHODS ===== */
case "OBJECT_TO_STRING":
  bytecode.push({ op: "OBJECT_TO_STRING" });
  break;

case "OBJECT_EQUALS":
  bytecode.push({ op: "OBJECT_EQUALS" });
  break;

case "OBJECT_HASH_CODE":
  bytecode.push({ op: "OBJECT_HASH_CODE" });
  break;

/* ===== v4.2 COLLECTIONS ===== */
case "NEW_ARRAYLIST":
  bytecode.push({ op: "NEW_ARRAYLIST" });
  break;

case "ARRAYLIST_ADD":
  bytecode.push({ op: "ARRAYLIST_ADD" });
  break;

case "ARRAYLIST_GET":
  bytecode.push({ op: "ARRAYLIST_GET" });
  break;

case "ARRAYLIST_SIZE":
  bytecode.push({ op: "ARRAYLIST_SIZE" });
  break;

case "NEW_HASHMAP":
  bytecode.push({ op: "NEW_HASHMAP" });
  break;

case "HASHMAP_PUT":
  bytecode.push({ op: "HASHMAP_PUT" });
  break;

case "HASHMAP_GET":
  bytecode.push({ op: "HASHMAP_GET" });
  break;

case "HASHMAP_CONTAINS_KEY":
  bytecode.push({ op: "HASHMAP_CONTAINS_KEY" });
  break;

case "HASHMAP_SIZE":
  bytecode.push({ op: "HASHMAP_SIZE" });
  break;

/* ===== v4.3 ITERATORS ===== */
case "ARRAYLIST_ITERATOR":
  bytecode.push({ op: "ARRAYLIST_ITERATOR" });
  break;

case "HASHMAP_ITERATOR":
  bytecode.push({ op: "HASHMAP_ITERATOR" });
  break;

case "ITERATOR_HAS_NEXT":
  bytecode.push({ op: "ITERATOR_HAS_NEXT" });
  break;

case "ITERATOR_NEXT":
  bytecode.push({ op: "ITERATOR_NEXT" });
  break;

/* ===== v4.5 STRINGBUILDER ===== */
case "NEW_STRINGBUILDER":
  bytecode.push({ op: "NEW_STRINGBUILDER" });
  break;

case "STRINGBUILDER_APPEND":
  bytecode.push({ op: "STRINGBUILDER_APPEND" });
  break;

case "STRINGBUILDER_TO_STRING":
  bytecode.push({ op: "STRINGBUILDER_TO_STRING" });
  break;

case "STRINGBUILDER_LENGTH":
  bytecode.push({ op: "STRINGBUILDER_LENGTH" });
  break;

/* ===== v2.9 VIRTUAL METHOD CALLS ===== */
case "CALL_VIRTUAL":
  bytecode.push({
    op: "CALL_VIRTUAL",
    arg: {
      methodName: arg.methodName,
      className: arg.className,
      argc: arg.argc,
      paramCount: arg.paramCount
    }
  });
  break;

      default:
        throw new Error(`Unknown IR opcode ${op}`);
    }
  }

  return bytecode;
}

module.exports = lowerIR;
