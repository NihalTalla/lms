const { tokenize } = require('./java/lexer/lexer');
const Parser = require('./java/parser/parser');

const code = `enum Color {
  RED
}

class Test {
  public static void main() {
    System.out.println(0);
  }
}`;

try {
  console.log("Tokenizing...");
  const tokens = tokenize(code);
  console.log("Tokens:", tokens.length);
  tokens.forEach((t, i) => {
    if (i < 15) console.log(`  ${i}: ${t.type}${t.value ? ' (' + t.value + ')' : ''}`);
  });
  
  console.log("\nParsing...");
  const parser = new Parser(tokens);
  const ast = parser.parse();
  console.log("Parsing successful!");
  console.log("AST body length:", ast.body.length);
  if (ast.body.length > 0) {
    console.log("First node type:", ast.body[0].type);
  } else {
    console.log("AST body is empty!");
  }
} catch (e) {
  console.error("Error:", e.message);
  console.error(e.stack);
}
