const fs = require('fs');
const path = require('path');

const lexer = require('./python/lexer');
const Parser = require('./python/parser');
const irgen = require('./python/irgen');
const lowerIR = require('./ir/ir_lower');
const VM = require('./vm/vm');

function testFile(fileName) {
  console.log(`\n========== Testing ${fileName} ==========`);
  const filePath = path.join(__dirname, 'test', fileName);
  const code = fs.readFileSync(filePath, 'utf8');
  
  try {
    const tokens = lexer(code);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const ir = irgen(ast);
    const bytecode = lowerIR(ir);
    
    console.log('--- OUTPUT ---');
    const vm = new VM(bytecode);
    vm.run();
    console.log(`✅ ${fileName} completed successfully`);
  } catch (error) {
    console.error(`❌ ${fileName} failed:`, error.message);
    console.error(error.stack);
  }
}

testFile('sample1.py');
testFile('sample.py');
