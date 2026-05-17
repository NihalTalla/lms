// judge.js - simple LMS/CP judge runner
// Usage:
//   node judge.js <program.py> <input.txt> <expected.txt>
//
// Exit codes:
//   0 = Accepted
//   1 = Wrong Answer
//   2 = Runtime/Compile Error

const fs = require('fs');
const path = require('path');

const lexer = require('./python/lexer');
const Parser = require('./python/parser');
const irgen = require('./python/irgen');
const lowerIR = require('./ir/ir_lower');
const VM = require('./vm/vm');

function normalizeOut(s) {
  // Normalize Windows/Unix newlines and trailing whitespace
  return String(s).replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trimEnd();
}

function runProgram(code, stdin, limits) {
  const tokens = lexer(code);
  const parser = new Parser(tokens);
  const ast = parser.parse();
  const ir = irgen(ast);
  const bytecode = lowerIR(ir);

  let out = '';
  const originalLog = console.log;
  const originalWrite = process.stdout.write;

  console.log = (...args) => { out += args.join(' ') + '\n'; };
  process.stdout.write = (str) => { out += String(str); };

  try {
    const vm = new VM(bytecode, { ...limits, stdin });
    vm.run();
  } finally {
    console.log = originalLog;
    process.stdout.write = originalWrite;
  }

  return out;
}

function main() {
  const programPath = process.argv[2];
  const inputPath = process.argv[3];
  const expectedPath = process.argv[4];

  if (!programPath || !inputPath || !expectedPath) {
    console.error('Usage: node judge.js <program.py> <input.txt> <expected.txt>');
    process.exit(2);
  }

  const code = fs.readFileSync(path.resolve(programPath), 'utf8');
  const stdin = fs.readFileSync(path.resolve(inputPath), 'utf8');
  const expected = fs.readFileSync(path.resolve(expectedPath), 'utf8');

  const limits = {
    maxSteps: 500000,
    maxTimeMs: 2000,
    maxStack: 20000,
    maxFrames: 2000,
    maxHeapCells: 2_000_000
  };

  let got;
  try {
    got = runProgram(code, stdin, limits);
  } catch (e) {
    console.error(String(e && e.stack ? e.stack : e));
    process.exit(2);
  }

  const normGot = normalizeOut(got);
  const normExp = normalizeOut(expected);

  if (normGot === normExp) {
    console.log('ACCEPTED');
    process.exit(0);
  }

  console.log('WRONG ANSWER');
  console.log('--- expected ---');
  console.log(normExp);
  console.log('--- got ---');
  console.log(normGot);
  process.exit(1);
}

main();

