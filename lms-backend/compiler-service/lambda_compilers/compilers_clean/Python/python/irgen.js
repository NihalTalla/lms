const { IRProgram } = require('../ir/ir');
const AST = require('./ast');

function generateIR(ast) {
  const ir = new IRProgram();

  ir.functionTable = new Map();
  ir.classTable = new Map(); // v2.0: class definitions

  const entryJump = ir.emit('JUMP', null);

  const loopStack = [];
  const globalStack = [];
  const nonlocalStack = [];

  /* ===================== CORE GENERATOR ===================== */

  function gen(node) {
    if (!node) return;

    switch (node.type) {

      /* ---------- LITERALS ---------- */
      case 'Number':
      case 'String':
        ir.emit('LOAD_CONST', node.value);
        break;

      case 'Dict': {
        // Build dictionary: push key-value pairs (key first, then value)
        const pairs = node.pairs;
        for (let i = pairs.length - 1; i >= 0; i--) {
          gen(pairs[i][0]); // key
          gen(pairs[i][1]); // value
        }
        ir.emit('BUILD_DICT', pairs.length);
        break;
      }

      case 'Tuple': {
        // Build tuple: push elements in forward order (same as lists)
        const elements = node.elements;
        elements.forEach(gen);
        ir.emit('BUILD_TUPLE', elements.length);
        break;
      }

      case 'Set': {
        // Build set: push elements in forward order
        const elements = node.elements;
        elements.forEach(gen);
        ir.emit('BUILD_SET', elements.length);
        break;
      }

      case 'Var':
        ir.emit('LOAD_VAR', node.name);
        break;

      /* ---------- EXPRESSIONS ---------- */
      case 'BinOp': {
        gen(node.left);
        gen(node.right);

        const map = {
          '+': 'ADD', '-': 'SUB', '*': 'MUL',
          '/': 'DIV', '%': 'MOD', '//': 'IDIV',
          '==': 'COMPARE_EQ', '!=': 'COMPARE_NE',
          '<': 'COMPARE_LT', '>': 'COMPARE_GT',
          '<=': 'COMPARE_LE', '>=': 'COMPARE_GE',
          'and': 'AND', 'or': 'OR'
        };

        ir.emit(map[node.op]);
        break;
      }

      case 'UnaryOp':
        gen(node.expr);
        if (node.op === '-') ir.emit('NEG');
        else if (node.op === 'not') ir.emit('NOT');
        break;

      case 'Ternary': {
        gen(node.cond);
        const jf = ir.emit('JUMP_IF_FALSE', null);
        gen(node.thenExpr);
        const jend = ir.emit('JUMP', null);
        ir.patch(jf, ir.instructions.length);
        gen(node.elseExpr);
        ir.patch(jend, ir.instructions.length);
        break;
      }

      /* ---------- ASSIGN ---------- */
      case 'Assign': {
        gen(node.value);

        if (
          nonlocalStack.length &&
          nonlocalStack.at(-1).has(node.name)
        ) {
          ir.emit('STORE_NONLOCAL', node.name);
        } else if (
          globalStack.length &&
          globalStack.at(-1).has(node.name)
        ) {
          ir.emit('STORE_GLOBAL', node.name);
        } else {
          ir.emit('STORE_VAR', node.name);
        }
        break;
      }

      case 'AssignIndex':
        gen(node.list);
        gen(node.index);
        gen(node.value);
        ir.emit('STORE_INDEX');
        break;

      case 'AssignSlice':
        gen(node.obj);
        node.start ? gen(node.start) : ir.emit('LOAD_CONST', null);
        node.end ? gen(node.end) : ir.emit('LOAD_CONST', null);
        node.step ? gen(node.step) : ir.emit('LOAD_CONST', null);
        gen(node.value);
        ir.emit('STORE_SLICE');
        break;

      /* ---------- LISTS ---------- */
      case 'List':
        node.elements.forEach(gen);
        ir.emit('BUILD_LIST', node.elements.length);
        break;

      /* ---------- COMPREHENSIONS (v2.2) ---------- */
      case 'ListComp': {
        // Generate comprehension using a for loop structure
        // result = []
        // for target in iterable:
        //   if condition (optional):
        //     result.append(expr)
        
        const resultVar = `__comp_result_${Date.now()}_${Math.random()}`;
        const indexVar = `__comp_index_${Date.now()}_${Math.random()}`;
        
        // Create empty result list
        ir.emit('BUILD_LIST', 0);
        ir.emit('STORE_VAR', resultVar);
        
        // Evaluate iterable and store
        gen(node.iterable);
        const iterVar = `__comp_iter_${Date.now()}_${Math.random()}`;
        ir.emit('STORE_VAR', iterVar);
        
        // Get length of iterable
        ir.emit('LOAD_VAR', iterVar);
        ir.emit('CALL', { name: 'len', argc: 1, kwargsNames: [], kwargsCount: 0 });
        const lenVar = `__comp_len_${Date.now()}_${Math.random()}`;
        ir.emit('STORE_VAR', lenVar);
        
        // Initialize index
        ir.emit('LOAD_CONST', 0);
        ir.emit('STORE_VAR', indexVar);
        
        // Loop start
        const loopStart = ir.instructions.length;
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_VAR', lenVar);
        ir.emit('LT');
        const loopEndJump = ir.emit('JUMP_IF_FALSE', null);
        
        // Get item at index: iterable[index]
        ir.emit('LOAD_VAR', iterVar);
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_INDEX');
        ir.emit('STORE_VAR', node.target);
        
        // Check condition if present
        if (node.condition) {
          gen(node.condition);
          const condJump = ir.emit('JUMP_IF_FALSE', null);
          
          // Evaluate expression and append
          ir.emit('LOAD_VAR', resultVar);
          gen(node.expr);
          ir.emit('LIST_APPEND');
          
          ir.patch(condJump, ir.instructions.length);
        } else {
          // No condition, just append
          ir.emit('LOAD_VAR', resultVar);
          gen(node.expr);
          ir.emit('LIST_APPEND');
        }
        
        // Increment index
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_CONST', 1);
        ir.emit('ADD');
        ir.emit('STORE_VAR', indexVar);
        
        // Jump back to loop start
        ir.emit('JUMP', loopStart);
        
        // Loop end
        ir.patch(loopEndJump, ir.instructions.length);
        ir.emit('LOAD_VAR', resultVar);
        break;
      }
      
      case 'DictComp': {
        // Similar to ListComp but builds a dictionary
        const resultVar = `__comp_result_${Date.now()}_${Math.random()}`;
        const indexVar = `__comp_index_${Date.now()}_${Math.random()}`;
        
        // Create empty result dict
        ir.emit('BUILD_DICT', 0);
        ir.emit('STORE_VAR', resultVar);
        
        // Evaluate iterable and store
        gen(node.iterable);
        const iterVar = `__comp_iter_${Date.now()}_${Math.random()}`;
        ir.emit('STORE_VAR', iterVar);
        
        // Get length of iterable
        ir.emit('LOAD_VAR', iterVar);
        ir.emit('CALL', { name: 'len', argc: 1, kwargsNames: [], kwargsCount: 0 });
        const lenVar = `__comp_len_${Date.now()}_${Math.random()}`;
        ir.emit('STORE_VAR', lenVar);
        
        // Initialize index
        ir.emit('LOAD_CONST', 0);
        ir.emit('STORE_VAR', indexVar);
        
        // Loop start
        const loopStart = ir.instructions.length;
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_VAR', lenVar);
        ir.emit('LT');
        const loopEndJump = ir.emit('JUMP_IF_FALSE', null);
        
        // Get item at index: iterable[index]
        ir.emit('LOAD_VAR', iterVar);
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_INDEX');
        ir.emit('STORE_VAR', node.target);
        
        // Check condition if present
        if (node.condition) {
          gen(node.condition);
          const condJump = ir.emit('JUMP_IF_FALSE', null);
          
          // Evaluate key and value expressions, then store in dict
          ir.emit('LOAD_VAR', resultVar);
          gen(node.keyExpr);
          gen(node.valueExpr);
          ir.emit('STORE_INDEX'); // result[key] = value
          
          ir.patch(condJump, ir.instructions.length);
        } else {
          // No condition, just add to dict
          ir.emit('LOAD_VAR', resultVar);
          gen(node.keyExpr);
          gen(node.valueExpr);
          ir.emit('STORE_INDEX'); // result[key] = value
        }
        
        // Increment index
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_CONST', 1);
        ir.emit('ADD');
        ir.emit('STORE_VAR', indexVar);
        
        // Jump back to loop start
        ir.emit('JUMP', loopStart);
        
        // Loop end
        ir.patch(loopEndJump, ir.instructions.length);
        ir.emit('LOAD_VAR', resultVar);
        break;
      }
      
      case 'SetComp': {
        // Similar to ListComp but builds a set
        const resultVar = `__comp_result_${Date.now()}_${Math.random()}`;
        const indexVar = `__comp_index_${Date.now()}_${Math.random()}`;
        
        // Create empty result set
        ir.emit('BUILD_SET', 0);
        ir.emit('STORE_VAR', resultVar);
        
        // Evaluate iterable and store
        gen(node.iterable);
        const iterVar = `__comp_iter_${Date.now()}_${Math.random()}`;
        ir.emit('STORE_VAR', iterVar);
        
        // Get length of iterable
        ir.emit('LOAD_VAR', iterVar);
        ir.emit('CALL', { name: 'len', argc: 1, kwargsNames: [], kwargsCount: 0 });
        const lenVar = `__comp_len_${Date.now()}_${Math.random()}`;
        ir.emit('STORE_VAR', lenVar);
        
        // Initialize index
        ir.emit('LOAD_CONST', 0);
        ir.emit('STORE_VAR', indexVar);
        
        // Loop start
        const loopStart = ir.instructions.length;
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_VAR', lenVar);
        ir.emit('LT');
        const loopEndJump = ir.emit('JUMP_IF_FALSE', null);
        
        // Get item at index: iterable[index]
        ir.emit('LOAD_VAR', iterVar);
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_INDEX');
        ir.emit('STORE_VAR', node.target);
        
        // Check condition if present
        if (node.condition) {
          gen(node.condition);
          const condJump = ir.emit('JUMP_IF_FALSE', null);
          
          // Evaluate expression and add to set.
          // CALL_METHOD pops: args first, then method.
          // So we want stack: [method (bottom), arg (top)]
          ir.emit('LOAD_VAR', resultVar); // Push set
          ir.emit('LOAD_ATTR', 'add');    // Pop set, push method
          gen(node.expr);                 // Push expression (arg)
          ir.emit('CALL_METHOD', { method: 'add', argc: 1, kwargsNames: [], kwargsCount: 0 });
          ir.emit('POP'); // Discard None return
          
          ir.patch(condJump, ir.instructions.length);
        } else {
          // No condition, just add to set
          // CALL_METHOD pops: args first, then method
          // So: push set, LOAD_ATTR to get method, push expr
          ir.emit('LOAD_VAR', resultVar); // Push set
          ir.emit('LOAD_ATTR', 'add'); // Pop set, push method
          gen(node.expr); // Push expression (argument)
          // Stack: [method (bottom), expr (top)] - CORRECT!
          ir.emit('CALL_METHOD', { method: 'add', argc: 1, kwargsNames: [], kwargsCount: 0 });
          ir.emit('POP'); // Discard None return
        }
        
        // Increment index
        ir.emit('LOAD_VAR', indexVar);
        ir.emit('LOAD_CONST', 1);
        ir.emit('ADD');
        ir.emit('STORE_VAR', indexVar);
        
        // Jump back to loop start
        ir.emit('JUMP', loopStart);
        
        // Loop end
        ir.patch(loopEndJump, ir.instructions.length);
        ir.emit('LOAD_VAR', resultVar);
        break;
      }

      case 'Index':
        gen(node.list);
        gen(node.index);
        ir.emit('LOAD_INDEX');
        break;

      case 'Slice':
        gen(node.obj);
        node.start ? gen(node.start) : ir.emit('LOAD_CONST', null);
        node.end ? gen(node.end) : ir.emit('LOAD_CONST', null);
        node.step ? gen(node.step) : ir.emit('LOAD_CONST', null);
        ir.emit('SLICE');
        break;

      /* ---------- EXCEPTIONS ---------- */
      case 'Try': {
        // Emit TRY first (no splice), then fill metadata once we know addresses.
        const tryInstrIndex = ir.emit('TRY', null);

        const tryBodyStart = ir.instructions.length;
        node.tryBody.forEach(gen);
        const tryBodyEnd = ir.instructions.length;

        const tryJump = ir.emit('JUMP', null); // Jump to finally/end
        
        // Generate except handlers
        const exceptHandlers = [];
        node.exceptClauses.forEach(clause => {
          const handlerStart = ir.instructions.length;
          if (clause.name) {
            // Store exception in variable
            ir.emit('STORE_VAR', clause.name);
          }
          clause.body.forEach(gen);
          const handlerEnd = ir.instructions.length;
          const handlerJump = ir.emit('JUMP', null); // Jump to finally/end

          // Normalize exception type for the VM:
          // - `except:` -> null (catch-all)
          // - `except ZeroDivisionError:` -> "ZeroDivisionError" (Var node)
          // - `except "ZeroDivisionError":` -> "ZeroDivisionError" (String node)
          // Anything more complex falls back to null (catch-all) to avoid breaking runtime.
          let exceptionName = null;
          if (clause.exception) {
            if (clause.exception.type === 'Var') exceptionName = clause.exception.name;
            else if (clause.exception.type === 'String') exceptionName = clause.exception.value;
          }
          exceptHandlers.push({
            exception: exceptionName,
            name: clause.name, // Store the exception variable name
            handlerStart,
            handlerEnd,
            handlerJump
          });
        });
        
        const finallyStart = node.finallyBody ? ir.instructions.length : null;
        if (node.finallyBody) {
          node.finallyBody.forEach(gen);
        }
        const endLabel = ir.instructions.length;
        
        // Patch jumps
        // If there's a finally block, try block should jump to it, otherwise to endLabel
        ir.patch(tryJump, finallyStart !== null ? finallyStart : endLabel);
        exceptHandlers.forEach(h => ir.patch(h.handlerJump, finallyStart !== null ? finallyStart : endLabel));

        // Fill TRY metadata now that all addresses are known.
        ir.instructions[tryInstrIndex].arg = {
          tryStart: tryBodyStart,
          tryEnd: tryBodyEnd,
          exceptHandlers: exceptHandlers.map(h => ({
            exception: h.exception,
            name: h.name, // Include exception variable name
            handlerStart: h.handlerStart
          })),
          finallyStart: finallyStart,
          endLabel: endLabel
        };
        break;
      }

      case 'Raise': {
        if (node.expr) {
          gen(node.expr);
        } else {
          ir.emit('LOAD_CONST', null);
        }
        ir.emit('RAISE');
        break;
      }

      case 'Assert': {
        gen(node.condition);
        const assertFail = ir.emit('JUMP_IF_FALSE', null);
        // Assertion passed, continue
        const assertEnd = ir.emit('JUMP', null);
        ir.patch(assertFail, ir.instructions.length);
        // Assertion failed
        if (node.message) {
          gen(node.message);
        } else {
          ir.emit('LOAD_CONST', 'AssertionError');
        }
        ir.emit('RAISE');
        ir.patch(assertEnd, ir.instructions.length);
        break;
      }

      /* ---------- IO ---------- */
      case 'Print':
        gen(node.expr);
        if (node.end) {
          gen(node.end);
          ir.emit('PRINT', { hasEnd: true });
        } else {
          ir.emit('PRINT', { hasEnd: false });
        }
        break;

      case 'PrintInline':
        gen(node.expr);
        ir.emit('PRINT_INLINE');
        break;

      /* ---------- IF ---------- */
      case 'If': {
        gen(node.condition);
        const jf = ir.emit('JUMP_IF_FALSE', null);
        node.thenBody.forEach(gen);
        let jend = null;
        if (node.elseBody) jend = ir.emit('JUMP', null);
        ir.patch(jf, ir.instructions.length);
        if (node.elseBody) {
          node.elseBody.forEach(gen);
          ir.patch(jend, ir.instructions.length);
        }
        break;
      }

      /* ---------- LOOPS ---------- */
      case 'While': {
        const start = ir.instructions.length;
        gen(node.condition);
        const jf = ir.emit('JUMP_IF_FALSE', null);

        const ctx = { breakJumps: [], continueJumps: [], continueTarget: start };
        loopStack.push(ctx);

        node.body.forEach(gen);
        ir.emit('JUMP', start);

        // Loop exit point (condition false)
        const loopEnd = ir.instructions.length;
        
        // If else exists, normal exit executes it, break skips it
        if (node.elseBody) {
          ir.patch(jf, ir.instructions.length); // Jump to else on normal exit
          node.elseBody.forEach(gen);
          const afterElse = ir.instructions.length;
          ctx.breakJumps.forEach(j => ir.patch(j, afterElse)); // Break skips else
        } else {
          ir.patch(jf, loopEnd);
          ctx.breakJumps.forEach(j => ir.patch(j, loopEnd));
        }
        
        ctx.continueJumps.forEach(j => ir.patch(j, start));
        loopStack.pop();
        break;
      }

      case 'For': {
        // ForNode: varName, args (array of [start, end, step] or [end] or [start, end]), body
        const varName = node.varName;
        const args = node.args;
        
        // Determine start, end, step
        let startExpr, endExpr, stepExpr;
        if (args.length === 1) {
          // range(end) -> start=0, end=args[0]
          startExpr = new AST.NumberNode(0);
          endExpr = args[0];
          stepExpr = new AST.NumberNode(1);
        } else if (args.length === 2) {
          // range(start, end) -> step=1
          startExpr = args[0];
          endExpr = args[1];
          stepExpr = new AST.NumberNode(1);
        } else {
          // range(start, end, step)
          startExpr = args[0];
          endExpr = args[1];
          stepExpr = args[2];
        }

        // Store step value in a temporary variable for comparison
        const stepVar = `$step_${varName}`;
        gen(stepExpr);
        ir.emit('STORE_VAR', stepVar);

        // Initialize loop variable to start
        gen(startExpr);
        ir.emit('STORE_VAR', varName);

        const loopStart = ir.instructions.length;

        // Check step direction and compare accordingly
        // If step > 0: check var < end
        // If step <= 0: check var > end
        ir.emit('LOAD_VAR', stepVar);
        ir.emit('LOAD_CONST', 0);
        ir.emit('COMPARE_GT'); // step > 0?
        const stepPositiveJump = ir.emit('JUMP_IF_FALSE', null);
        
        // Positive step path: var < end (jump to exit if var >= end)
        ir.emit('LOAD_VAR', varName);
        gen(endExpr);
        ir.emit('COMPARE_LT');
        const positiveJf = ir.emit('JUMP_IF_FALSE', null);
        const jumpToBody = ir.emit('JUMP', null); // Jump to body if condition is true
        const afterPositive = ir.instructions.length;
        ir.patch(stepPositiveJump, afterPositive);
        
        // Negative/zero step path: var > end (jump to exit if var <= end)
        ir.emit('LOAD_VAR', varName);
        gen(endExpr);
        ir.emit('COMPARE_GT');
        const negativeJf = ir.emit('JUMP_IF_FALSE', null);
        
        // Both paths converge here if condition is true (body start)
        const bodyStart = ir.instructions.length;
        ir.patch(jumpToBody, bodyStart); // Positive path true -> body
        
        // Store exit jumps to patch later (they should jump to loopEnd when condition is false)
        const exitJumps = [positiveJf, negativeJf];

        const ctx = { breakJumps: [], continueJumps: [], continueTarget: null };
        loopStack.push(ctx);

        // Loop body
        node.body.forEach(gen);

        // Increment: var = var + step (continue jumps here)
        const incrementStart = ir.instructions.length;
        ir.emit('LOAD_VAR', varName);
        ir.emit('LOAD_VAR', stepVar);
        ir.emit('ADD');
        ir.emit('STORE_VAR', varName);

        ir.emit('JUMP', loopStart);

        const loopEnd = ir.instructions.length;
        
        // If else exists, normal exit executes it, break skips it
        if (node.elseBody) {
          // Patch exit jumps to else block (normal completion)
          exitJumps.forEach(j => ir.patch(j, ir.instructions.length));
          node.elseBody.forEach(gen);
          const afterElse = ir.instructions.length;
          ctx.breakJumps.forEach(j => ir.patch(j, afterElse)); // Break skips else
        } else {
          // No else: both normal exit and break go to loopEnd
          exitJumps.forEach(j => ir.patch(j, loopEnd));
          ctx.breakJumps.forEach(j => ir.patch(j, loopEnd));
        }
        
        ctx.continueJumps.forEach(j => ir.patch(j, incrementStart));
        loopStack.pop();
        break;
      }

      /* ---------- ATTRIBUTE ACCESS (v2.0) ---------- */
      case 'Attr': {
        gen(node.obj);
        ir.emit('LOAD_ATTR', node.attr);
        break;
      }

      /* ---------- ATTRIBUTE ASSIGNMENT (v2.0) ---------- */
      case 'AttrAssign': {
        gen(node.obj);
        gen(node.value);
        ir.emit('STORE_ATTR', node.attr);
        break;
      }

      /* ---------- SUPER (v2.0) ---------- */
      case 'Super': {
        ir.emit('LOAD_SUPER');
        break;
      }

      /* ---------- CALLS ---------- */
      case 'Call': {
        const positional = node.args || [];
        const kwargsAST = node.kwargs || {};
        const kwargsKeys = Object.keys(kwargsAST);

        // v2.0: Handle method calls (node.name is AttrNode)
        if (node.name && typeof node.name === 'object' && node.name.type === 'Attr') {
          // Special case: list.append() and list.pop() for backward compatibility
          if (node.name.obj.type === 'Var' && (node.name.attr === 'append' || node.name.attr === 'pop')) {
            if (node.name.attr === 'append') {
              gen(node.name.obj);
              gen(positional[0]);
              ir.emit('LIST_APPEND');
            } else if (node.name.attr === 'pop') {
              gen(node.name.obj);
              ir.emit('LIST_POP');
            }
            break;
          }
          
          // Method call: obj.method(...)
          // First load the attribute (method), which pushes the method onto stack
          gen(node.name); // This generates LOAD_ATTR, which pushes the method
          // Then push arguments
          positional.forEach(gen);
          for (let i = kwargsKeys.length - 1; i >= 0; i--) {
            gen(kwargsAST[kwargsKeys[i]]);
          }
          ir.emit('CALL_METHOD', {
            method: node.name.attr,
            argc: positional.length,
            kwargsNames: kwargsKeys,
            kwargsCount: kwargsKeys.length
          });
          break;
        }

        // v2.0: Handle super() calls
        if (node.name && typeof node.name === 'object' && node.name.type === 'Super') {
          positional.forEach(gen);
          for (let i = kwargsKeys.length - 1; i >= 0; i--) {
            gen(kwargsAST[kwargsKeys[i]]);
          }
          ir.emit('CALL_SUPER', {
            argc: positional.length,
            kwargsNames: kwargsKeys,
            kwargsCount: kwargsKeys.length
          });
          break;
        }

        // Legacy: list methods (backward compatibility)
        // Handle when parser creates CallNode with string name like "lst.append"
        if (typeof node.name === 'string' && node.name.endsWith('.append')) {
          const listVarName = node.name.split('.')[0];
          // positional is already extracted from node.args above
          if (positional.length === 0) {
            throw new Error("append() requires an argument");
          }
          gen(new AST.VarNode(listVarName)); // Push list
          gen(positional[0]); // Push value
          ir.emit('LIST_APPEND'); // Pop value (top), pop list (below), append
          break;
        }

        if (typeof node.name === 'string' && node.name.endsWith('.pop')) {
          gen(new AST.VarNode(node.name.split('.')[0]));
          ir.emit('LIST_POP');
          break;
        }

       // builtin or named call (arguments first is fine here)
// Check if it's a builtin function (node.name can be string or VarNode)
const funcName = typeof node.name === 'string' ? node.name : (node.name?.type === 'Var' ? node.name.name : null);
if (funcName && ['len', 'input', 'int', 'str'].includes(funcName)) {
  positional.forEach(gen);
  
  // Evaluate kwargs expressions and push values onto stack (in reverse order for popping)
  for (let i = kwargsKeys.length - 1; i >= 0; i--) {
    gen(kwargsAST[kwargsKeys[i]]);
  }
  
  ir.emit('CALL', {
    name: funcName,
    argc: positional.length,
    kwargsNames: kwargsKeys, // Pass names so VM can create kwargs object
    kwargsCount: kwargsKeys.length
  });
  break;
}

// function value call or class instantiation: f(...) or MyClass(...)
// 🔥 PUSH FUNCTION/CLASS FIRST
if (typeof node.name === 'string') {
  gen(new AST.VarNode(node.name));
} else {
  gen(node.name); // Could be VarNode or other expression
}

// 🔥 THEN PUSH ARGUMENTS
positional.forEach(gen);

// Evaluate kwargs expressions and push values onto stack (in reverse order for popping)
for (let i = kwargsKeys.length - 1; i >= 0; i--) {
  gen(kwargsAST[kwargsKeys[i]]);
}

ir.emit('CALL', {
  argc: positional.length,
  kwargsNames: kwargsKeys, // Pass names so VM can create kwargs object
  kwargsCount: kwargsKeys.length,
  valueCall: true
});
break;
      }

      /* ---------- RETURN ---------- */
      case 'Return':
        node.value ? (gen(node.value), ir.emit('RETURN_VAL')) : ir.emit('RETURN');
        break;

      case 'Pass':
        break;

      case 'Break': {
        const ctx = loopStack.at(-1);
        ctx.breakJumps.push(ir.emit('JUMP', null));
        break;
      }

      case 'Continue': {
        const ctx = loopStack.at(-1);
        ctx.continueJumps.push(ir.emit('JUMP', null));
        break;
      }

      /* ---------- GLOBAL / NONLOCAL ---------- */
      case 'Global':
        globalStack.at(-1).add(...node.names);
        break;

      case 'Nonlocal':
        nonlocalStack.at(-1).add(...node.names);
        break;

      case 'ExprStmt':
        gen(node.expr);
        ir.emit('POP');
        break;

      case 'Function': {
        // Nested function - generate MAKE_FUNCTION and STORE_VAR
        // The function body was already generated by genFunctionBodyOnly
        ir.emit('MAKE_FUNCTION', {
          entry: ir.functionTable.get(node.name),
          argc: node.params.length,
          paramIndex: Object.fromEntries(node.params.map((p, i) => [p.name, i]))
        });
        ir.emit('STORE_VAR', node.name);
        break;
      }

      default:
        throw new Error(`Unknown AST node ${node.type}`);
    }
  }

  /* ===================== FUNCTION BODY EMITTER ===================== */

  function genFunctionBodyOnly(fn) {
    globalStack.push(new Set());
    nonlocalStack.push(new Set());

    fn.body.filter(s => s.type === 'Function')
           .forEach(genFunctionBodyOnly);

    const entry = ir.instructions.length;
    ir.functionTable.set(fn.name, entry);

fn.params.forEach((p, i) => {
  // if $arg{i} == undefined ?
  ir.emit('LOAD_VAR', `$arg${i}`);
  ir.emit('LOAD_CONST', undefined);
  ir.emit('COMPARE_EQ');

  const useArg = ir.emit('JUMP_IF_FALSE', null);

  // default / missing-arg path
  if (p.default) {
    gen(p.default);
    ir.emit('STORE_VAR', p.name);
  } else {
    ir.emit('LOAD_CONST', `missing argument '${p.name}'`);
    ir.emit('RAISE_TYPE_ERROR');
  }

  const end = ir.emit('JUMP', null);   // 🔥 IMPORTANT

  // arg-exists path
  ir.patch(useArg, ir.instructions.length);
  ir.emit('LOAD_VAR', `$arg${i}`);
  ir.emit('STORE_VAR', p.name);

  // end
  ir.patch(end, ir.instructions.length);
});


    fn.body.forEach(gen);
    ir.emit('RETURN');

    globalStack.pop();
    nonlocalStack.pop();
  }

  /* ===================== CLASS BODY EMITTER (v2.0) ===================== */

  function genClassBodyOnly(cls) {
    // Generate method bodies (they're functions with special names)
    cls.methods.forEach(method => {
      const methodName = `__class_${cls.name}_${method.name}`;
      globalStack.push(new Set());
      nonlocalStack.push(new Set());

      // Process nested functions in method body
      method.body.filter(s => s.type === 'Function')
                  .forEach(genFunctionBodyOnly);

      const entry = ir.instructions.length;
      ir.functionTable.set(methodName, entry);

      // Generate method body (similar to function body)
      method.params.forEach((p, i) => {
        ir.emit('LOAD_VAR', `$arg${i}`);
        ir.emit('LOAD_CONST', undefined);
        ir.emit('COMPARE_EQ');
        const useArg = ir.emit('JUMP_IF_FALSE', null);
        if (p.default) {
          gen(p.default);
          ir.emit('STORE_VAR', p.name);
        } else {
          ir.emit('LOAD_CONST', `missing argument '${p.name}'`);
          ir.emit('RAISE_TYPE_ERROR');
        }
        const end = ir.emit('JUMP', null);
        ir.patch(useArg, ir.instructions.length);
        ir.emit('LOAD_VAR', `$arg${i}`);
        ir.emit('STORE_VAR', p.name);
        ir.patch(end, ir.instructions.length);
      });

      method.body.forEach(gen);
      ir.emit('RETURN');

      globalStack.pop();
      nonlocalStack.pop();
    });
  }

  /* ===================== PROGRAM ===================== */

  // Generate function bodies first
  ast.filter(s => s.type === 'Function')
     .forEach(genFunctionBodyOnly);

  // Generate class method bodies (v2.0)
  ast.filter(s => s.type === 'Class')
     .forEach(genClassBodyOnly);

  ir.patch(entryJump, ir.instructions.length);

  // Store functions
  ast.filter(s => s.type === 'Function')
     .forEach(fn => {
       ir.emit('MAKE_FUNCTION', {
         entry: ir.functionTable.get(fn.name),
         argc: fn.params.length,
         paramIndex: Object.fromEntries(fn.params.map((p, i) => [p.name, i]))
       });
       ir.emit('STORE_VAR', fn.name);
     });

  // Store classes (v2.0)
  ast.filter(s => s.type === 'Class')
     .forEach(cls => {
       // If there's a base class, evaluate it first
       if (cls.baseClass) {
         gen(cls.baseClass);
       }
       ir.emit('MAKE_CLASS', {
         name: cls.name,
         baseClass: cls.baseClass ? 'stack' : null, // Indicate base class is on stack if present
         methods: cls.methods.map(m => ({
           name: m.name,
           entry: ir.functionTable.get(`__class_${cls.name}_${m.name}`),
           argc: m.params.length,
           paramIndex: Object.fromEntries(m.params.map((p, i) => [p.name, i]))
         }))
       });
       ir.emit('STORE_VAR', cls.name);
     });

  ast.filter(s => s.type !== 'Function' && s.type !== 'Class')
     .forEach(gen);

  ir.emit('HALT');
  return ir;
}

module.exports = generateIR;
