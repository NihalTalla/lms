// Final debug to find the exact bug
const fs = require('fs');
const lexer = require('./python/lexer');
const Parser = require('./python/parser');

const code = fs.readFileSync('test/sample1.py', 'utf8');
const tokens = lexer(code);

// Monkey-patch to log inFunction changes
const originalFunctionDef = Parser.prototype.statement;
let functionStack = [];

Parser.prototype.statement = function() {
  const t = this.current();
  if (!t) return null;
  
  // Track when we enter/exit functions
  if (t.type === 'DEF' && this.pos >= 790 && this.pos <= 800) {
    const prev = this.inFunction;
    console.log(`  [DEF at ${this.pos}] prev=${prev}, inFunction=${this.inFunction}, stack=[${functionStack.join(',')}]`);
    functionStack.push(prev);
  }
  
  const result = originalFunctionDef.call(this);
  
  // Track when we finish functions
  if (result && result.type === 'Function' && this.pos >= 840 && this.pos <= 855) {
    const prev = functionStack.pop();
    console.log(`  [Function finished at ${this.pos}] prev=${prev}, inFunction=${this.inFunction}, stack=[${functionStack.join(',')}]`);
  }
  
  // Log inFunction changes in the critical range
  if (this.pos >= 840 && this.pos <= 855) {
    console.log(`  pos=${this.pos}, token=${t.type}, inFunction=${this.inFunction}`);
  }
  
  return result;
};

try {
  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log('SUCCESS');
} catch (e) {
  console.log('ERROR:', e.message);
}
