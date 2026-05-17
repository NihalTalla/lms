const { tokenize } = require("./lexer/lexer");
const Parser = require("./parser/parser");
const generateIR = require("./irgen/irgen");
const lowerIR = require("../ir/ir_lower");
const VirtualMachine = require("../vm/vm");

function compileAndRun(source) {
  // 1. Lexer
  const tokens = tokenize(source);

  // 2. Parser
  const parser = new Parser(tokens);
  const ast = parser.parse();

  // 3. IR generation
  const irProgram = generateIR(ast);

  // 4. IR → BYTECODE (REQUIRED)
  const bytecode = lowerIR(irProgram);

  // 5. VM
  const vm = new VirtualMachine(bytecode);
  vm.run();
}

module.exports = compileAndRun;
