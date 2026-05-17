function generate(ast) {
  const bytecode = [];
  const functions = {};
  const loopStack = [];

  function emit(instr) {
    bytecode.push(instr);
    return bytecode.length - 1;
  }

  function patch(i, target) {
    bytecode[i][1] = target;
  }

  function gen(node) {
    if (!node) return;

    switch (node.type) {

      /* ---------- VALUES ---------- */

      case 'Number':
        emit(['LOAD_CONST', node.value]);
        break;

      case 'Var':
        emit(['LOAD_VAR', node.name]);
        break;

      /* ---------- EXPRESSIONS ---------- */

      case 'BinOp':
        gen(node.left);
        gen(node.right);

        if (node.op === '+') emit(['ADD']);
        else if (node.op === '-') emit(['SUB']);
        else if (node.op === '*') emit(['MUL']);
        else if (node.op === '%') emit(['MOD']);
        else if (node.op === '//') emit(['IDIV']);
        else if (node.op === '/') emit(['DIV']);
        else if (node.op === '==') emit(['COMPARE_EQ']);
        else if (node.op === '!=') emit(['COMPARE_NE']);
        else if (node.op === '<') emit(['COMPARE_LT']);
        else if (node.op === '>') emit(['COMPARE_GT']);
        else if (node.op === '<=') emit(['COMPARE_LE']);
        else if (node.op === '>=') emit(['COMPARE_GE']);
        else if (node.op === 'and') emit(['AND']);
        else if (node.op === 'or') emit(['OR']);
        else if (node.op === 'not') emit(['NOT']);
        else throw new Error(`Unknown operator ${node.op}`);
        break;

      /* ---------- ASSIGN ---------- */

      case 'Assign':
        gen(node.value);
        emit(['STORE_VAR', node.name]);
        break;

      /* ---------- PRINT ---------- */

      case 'Print':
        gen(node.expr);
        emit(['PRINT']);
        break;
      case 'PrintInline':
  gen(node.expr);
  emit(['PRINT_INLINE']);
  break;

      /* ---------- IF ---------- */

      case 'If': {
  const endJumps = [];

  // --- IF ---
  gen(node.condition);
  let jf = emit(['JUMP_IF_FALSE', null]);
  for (const s of node.thenBody) gen(s);
  endJumps.push(emit(['JUMP', null]));
  patch(jf, bytecode.length);

  // --- ELIF(s) ---
  for (const elif of node.elifs || []) {
    gen(elif.cond);
    jf = emit(['JUMP_IF_FALSE', null]);
    for (const s of elif.body) gen(s);
    endJumps.push(emit(['JUMP', null]));
    patch(jf, bytecode.length);
  }

  // --- ELSE ---
  if (node.elseBody) {
    for (const s of node.elseBody) gen(s);
  }

  // --- PATCH ALL END JUMPS ---
  for (const j of endJumps) {
    patch(j, bytecode.length);
  }
  break;
}

      case 'List':
  // push elements in order
  for (const el of node.elements) {
    gen(el);
  }
  emit(['BUILD_LIST', node.elements.length]);
  break;

case 'Index':
  gen(node.list);
  gen(node.index);
  emit(['LOAD_INDEX']);
  break;

case 'AssignIndex':
  gen(node.list);
  gen(node.index);
  gen(node.value);
  emit(['STORE_INDEX']);
  break;

      /* ---------- WHILE ---------- */

      case 'While': {
        const start = bytecode.length;
        gen(node.condition);
        const jf = emit(['JUMP_IF_FALSE', null]);

        loopStack.push({ start, breaks: [], continues: [] });

        for (const s of node.body) gen(s);

        emit(['JUMP', start]);
        patch(jf, bytecode.length);

        const loop = loopStack.pop();
        for (const b of loop.breaks) patch(b, bytecode.length);
        for (const c of loop.continues) patch(c, start);
        break;
      }

      /* ---------- FOR ---------- */

      case 'For': {
        emit(['LOAD_CONST', 0]);
        emit(['STORE_VAR', node.var]);

        const start = bytecode.length;

        emit(['LOAD_VAR', node.var]);
        gen(node.end);
        emit(['COMPARE_LT']);

        const jf = emit(['JUMP_IF_FALSE', null]);

        loopStack.push({ start, breaks: [], continues: [] });

        for (const s of node.body) gen(s);

        emit(['LOAD_VAR', node.var]);
        emit(['LOAD_CONST', 1]);
        emit(['ADD']);
        emit(['STORE_VAR', node.var]);

        emit(['JUMP', start]);
        patch(jf, bytecode.length);

        const loop = loopStack.pop();
        for (const b of loop.breaks) patch(b, bytecode.length);
        for (const c of loop.continues) patch(c, start);
        break;
      }

      case 'Break':
        loopStack.at(-1).breaks.push(emit(['JUMP', null]));
        break;

      case 'Continue':
        loopStack.at(-1).continues.push(emit(['JUMP', null]));
        break;

      /* ---------- FUNCTIONS ---------- */

      case 'Function': {
        const funcStart = bytecode.length;
        functions[node.name] = funcStart;

        for (let i = 0; i < node.params.length; i++) {
  emit(['LOAD_VAR', `$arg${i}`]);
  emit(['STORE_VAR', node.params[i]]);
}


        for (const s of node.body) gen(s);

        emit(['RETURN']);
        break;
      }

      case 'Return':
        gen(node.value);
        emit(['RETURN_VAL']);
        break;

      case 'Call':
        for (const arg of node.args) gen(arg);
        emit(['CALL', functions[node.name], node.args.length]);
        break;

      default:
        throw new Error(`Unknown AST node ${node.type}`);
    }
  }

  // 🔥 CRITICAL FIX: jump over function bodies
  const entryJump = emit(['JUMP', null]);

  // compile functions
  for (const stmt of ast) {
    if (stmt.type === 'Function') gen(stmt);
  }

  // main starts here
  const mainStart = bytecode.length;
  patch(entryJump, mainStart);

  // compile main program
  for (const stmt of ast) {
    if (stmt.type !== 'Function') gen(stmt);
  }

  emit(['HALT']);
  return bytecode;
}

module.exports = generate;
