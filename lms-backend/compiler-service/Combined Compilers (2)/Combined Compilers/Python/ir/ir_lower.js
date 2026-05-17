// ir/ir_lower.js

function lowerIR(ir) {
  const bytecode = [];
  const addrMap = new Map();       // IR index → bytecode index
const functionTable = new Map();

/* ---------- PASS 1: build address map ---------- */
let bcIndex = 0;
for (let i = 0; i < ir.instructions.length; i++) {
  const instr = ir.instructions[i];
  addrMap.set(i, bcIndex);

  // IR ops that emit NO bytecode
  if (
    instr.op === 'FUNC_LABEL' ||
    instr.op === 'DECLARE_GLOBAL' ||
    instr.op === 'DECLARE_NONLOCAL'
  ) {
    if (instr.op === 'FUNC_LABEL') {
      functionTable.set(instr.arg, bcIndex);
    }
    continue;
  }

  bcIndex++;
}


  /* ---------- PASS 2: emit bytecode ---------- */
  for (let i = 0; i < ir.instructions.length; i++) {
    const instr = ir.instructions[i];
    const { op, arg } = instr;

    switch (op) {

      /* ----- CONSTANTS & VARIABLES ----- */
      case 'LOAD_CONST': bytecode.push(['LOAD_CONST', arg]); break;
      case 'LOAD_VAR':   bytecode.push(['LOAD_VAR', arg]); break;
      case 'STORE_VAR':  bytecode.push(['STORE_VAR', arg]); break;
      case 'STORE_GLOBAL': bytecode.push(['STORE_GLOBAL', arg]); break;
      case 'STORE_NONLOCAL': bytecode.push(['STORE_NONLOCAL', arg]); break;
      /* ----- ARITHMETIC ----- */
      case 'ADD': bytecode.push(['ADD']); break;
      case 'SUB': bytecode.push(['SUB']); break;
      case 'MUL': bytecode.push(['MUL']); break;
      case 'DIV': bytecode.push(['DIV']); break;
      case 'MOD': bytecode.push(['MOD']); break;
      case 'IDIV': bytecode.push(['IDIV']); break;
      case 'NEG': bytecode.push(['NEG']); break;

      /* ----- COMPARISONS ----- */
      /* ----- COMPARISONS ----- */
case 'COMPARE_EQ':
case 'EQ':
  bytecode.push(['EQ']);
  break;

case 'COMPARE_NE':
case 'NE':
  bytecode.push(['NE']);
  break;

case 'COMPARE_LT':
case 'LT':
  bytecode.push(['LT']);
  break;

case 'COMPARE_GT':
case 'GT':
  bytecode.push(['GT']);
  break;

case 'COMPARE_LE':
case 'LE':
  bytecode.push(['LE']);
  break;

case 'COMPARE_GE':
case 'GE':
  bytecode.push(['GE']);
  break;


      /* ----- LOGICAL ----- */
      case 'AND': bytecode.push(['AND']); break;
      case 'OR':  bytecode.push(['OR']); break;
      case 'NOT': bytecode.push(['NOT']); break;

      /* ----- CONTROL FLOW ----- */
      case 'JUMP':
        bytecode.push(['JUMP', addrMap.get(arg)]);
        break;

      case 'JUMP_IF_FALSE':
        bytecode.push(['JUMP_IF_FALSE', addrMap.get(arg)]);
        break;

      /* ----- CALLS ----- */
case 'CALL': {
  // ---------- FUNCTION VALUE CALL ----------
   if (arg && arg.valueCall === true) {
    bytecode.push([
      'CALL',
      undefined,
      arg.argc,
      {
        kwargsNames: arg.kwargsNames || [],
        kwargsCount: arg.kwargsCount || 0
      }
    ]);
    break;
  }

  // ---------- NAMED / BUILTIN CALL ----------
  if (arg && typeof arg === 'object') {
    const addr = functionTable.get(arg.name);
    // For builtins (len, input, int), addr will be undefined
    // Set to null explicitly so VM can recognize it as a builtin call
    const finalAddr = (addr === undefined && ['len', 'input', 'int', 'str'].includes(arg.name)) ? null : addr;

   bytecode.push([
  'CALL',
  finalAddr,
  arg.argc,
  {
    name: arg.name,
    kwargsNames: arg.kwargsNames || [],
    kwargsCount: arg.kwargsCount || 0
  }
]);

    break;
  }

  throw new Error(`Invalid CALL IR format: ${JSON.stringify(arg)}`);
}


case 'MAKE_FUNCTION':
  bytecode.push(['MAKE_FUNCTION', arg]);
  break;

      /* ----- CLASSES & OBJECTS (v2.0) ----- */
      case 'LOAD_ATTR':
        bytecode.push(['LOAD_ATTR', arg]);
        break;
      case 'STORE_ATTR':
        bytecode.push(['STORE_ATTR', arg]);
        break;
      case 'MAKE_CLASS':
        bytecode.push(['MAKE_CLASS', arg]);
        break;
      case 'CALL_METHOD':
        bytecode.push(['CALL_METHOD', arg]);
        break;
      case 'CALL_SUPER':
        bytecode.push(['CALL_SUPER', arg]);
        break;
      case 'LOAD_SUPER':
        bytecode.push(['LOAD_SUPER']);
        break;

      /* ----- RETURNS ----- */
      case 'RETURN': bytecode.push(['RETURN']); break;
      case 'RETURN_VAL': bytecode.push(['RETURN_VAL']); break;

      /* ----- LISTS ----- */
      case 'BUILD_LIST': bytecode.push(['BUILD_LIST', arg]); break;
      case 'BUILD_DICT': bytecode.push(['BUILD_DICT', arg]); break;
      case 'BUILD_TUPLE': bytecode.push(['BUILD_TUPLE', arg]); break;
      case 'BUILD_SET': bytecode.push(['BUILD_SET', arg]); break;
      case 'LOAD_INDEX': bytecode.push(['LOAD_INDEX']); break;
      case 'STORE_INDEX': bytecode.push(['STORE_INDEX']); break;
      case 'STORE_SLICE': bytecode.push(['STORE_SLICE']); break;
      case 'RAISE': bytecode.push(['RAISE']); break;
      case 'TRY': {
        // Convert IR indices to bytecode indices
        if (arg && typeof arg === 'object') {
          const convertedArg = {
            tryStart: addrMap.get(arg.tryStart) ?? arg.tryStart,
            tryEnd: addrMap.get(arg.tryEnd) ?? arg.tryEnd,
            exceptHandlers: arg.exceptHandlers.map(h => ({
              exception: h.exception,
              handlerStart: addrMap.get(h.handlerStart) ?? h.handlerStart
            })),
            finallyStart: arg.finallyStart !== null ? (addrMap.get(arg.finallyStart) ?? arg.finallyStart) : null,
            endLabel: addrMap.get(arg.endLabel) ?? arg.endLabel
          };
          bytecode.push(['TRY', convertedArg]);
        } else {
          bytecode.push(['TRY', arg]);
        }
        break;
      }
      case 'SLICE': bytecode.push(['SLICE']); break;
      case 'LIST_APPEND': bytecode.push(['LIST_APPEND']); break;
      case 'LIST_POP': bytecode.push(['LIST_POP']); break;

      /* ----- IO ----- */
      case 'PRINT': bytecode.push(['PRINT', arg || {}]); break;
      case 'PRINT_INLINE': bytecode.push(['PRINT_INLINE']); break;

      /* ----- PROGRAM END ----- */
      case 'HALT': bytecode.push(['HALT']); break;

      /* ----- LABEL (no bytecode) ----- */
      case 'FUNC_LABEL':
        break;
      case 'DECLARE_GLOBAL':
  // declaration only → no runtime bytecode
  break;
case 'RAISE_TYPE_ERROR':
  bytecode.push(['RAISE_TYPE_ERROR']);
  break;

case 'DECLARE_NONLOCAL':
  // declaration only → no runtime bytecode
  break;
case 'POP':
  bytecode.push(['POP']);
  break;

      default:
        throw new Error(`Unknown IR opcode ${op}`);
    }
  }

  return bytecode;
}

module.exports = lowerIR;
