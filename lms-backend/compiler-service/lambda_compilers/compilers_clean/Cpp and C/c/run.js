// c/run.js
// Usage: node c/run.js
// Test file: test/try.c  (test folder is beside c)

const fs = require("fs");
const path = require("path");

// Frontend
const { preprocess } = require("./preprocessor");
const { Lexer } = require("./lexer");
const { Parser } = require("./parser");
const sema = require("./sema");
const generateIR = require("./irgen");

// Backend
const lowerIR = require("../ir/ir_lower");
const VirtualMachine = require("../vm/vm");

const TEST_FILE = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, "..", "test", "try.c");

function main() {
  if (!fs.existsSync(TEST_FILE)) {
    throw new Error(`Test file not found: ${TEST_FILE}`);
  }

  const source = fs.readFileSync(TEST_FILE, "utf8");
  const baseDir = path.dirname(TEST_FILE);
  
  // Preprocess source
  const preprocessed = preprocess(source, baseDir);

  const lexer = new Lexer(preprocessed);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parseProgram();

  const semaResult = sema.analyze(ast);

  const ir = generateIR(semaResult);
  const bytecode = lowerIR(ir);

  const vm = new VirtualMachine(bytecode);
  vm.run();
}

main();
