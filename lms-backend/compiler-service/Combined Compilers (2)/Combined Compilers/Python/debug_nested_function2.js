// More detailed debug to trace exactly when inFunction changes
const fs = require('fs');
const lexer = require('./python/lexer');
const Parser = require('./python/parser');

const code = fs.readFileSync('test/sample1.py', 'utf8');
const tokens = lexer(code);

// Monkey-patch the parser to log inFunction changes
const originalStatement = Parser.prototype.statement;
const originalEat = Parser.prototype.eat;

let logEnabled = false;
let functionDepth = 0;

Parser.prototype.eat = function(type) {
  if (logEnabled && this.pos >= 840 && this.pos <= 855) {
    console.log(`  eat(${type}) at pos ${this.pos}, inFunction=${this.inFunction}, depth=${functionDepth}`);
  }
  return originalEat.call(this, type);
};

Parser.prototype.statement = function() {
  const t = this.current();
  if (!t) return null;
  
  // Track function depth
  if (t.type === 'DEF') {
    functionDepth++;
    logEnabled = true;
  }
  
  if (logEnabled && this.pos >= 840 && this.pos <= 855) {
    console.log(`statement() at pos ${this.pos}, token=${t.type}, inFunction=${this.inFunction}, depth=${functionDepth}`);
  }
  
  const result = originalStatement.call(this);
  
  // Check if we just finished a function
  if (result && result.type === 'Function') {
    functionDepth--;
    if (functionDepth === 0) logEnabled = false;
    if (logEnabled) {
      console.log(`  Finished function, inFunction=${this.inFunction}, depth=${functionDepth}`);
    }
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
