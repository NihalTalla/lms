// Debug script to trace the nested function parsing bug
const fs = require('fs');
const lexer = require('./python/lexer');
const Parser = require('./python/parser');

// Read the full file
const code = fs.readFileSync('test/sample1.py', 'utf8');
const tokens = lexer(code);

console.log('=== TOKEN ANALYSIS ===');
console.log('Tokens around position 840-855:');
for (let i = 838; i < Math.min(856, tokens.length); i++) {
  const t = tokens[i];
  console.log(`${i}: ${t.type.padEnd(15)} ${JSON.stringify(t.value || '')}`);
}

console.log('\n=== PARSING WITH DEBUG ===');
// Create a modified parser that logs inFunction state
class DebugParser extends Parser {
  statement() {
    const result = super.statement();
    if (this.pos >= 840 && this.pos <= 855) {
      console.log(`  Position ${this.pos}: inFunction=${this.inFunction}, token=${this.tokens[this.pos]?.type}`);
    }
    return result;
  }
}

try {
  const parser = new DebugParser(tokens);
  const ast = parser.parse();
  console.log('SUCCESS: Parsed correctly');
} catch (e) {
  console.log('ERROR:', e.message);
  console.log('Stack:', e.stack);
}
