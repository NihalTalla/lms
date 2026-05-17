const fs = require("fs");
const { tokenize } = require("./java/lexer/lexer");
const Parser = require("./java/parser/parser");

const code = fs.readFileSync("test_debug.java", "utf-8");
const tokens = tokenize(code);
const parser = new Parser(tokens);
const ast = parser.parse();

// Navigate through AST to find array.length expression
if (ast.body && ast.body[0] && ast.body[0].body) {
  const mainMethod = ast.body[0].body.find(item => item.name === "main");
  if (mainMethod && mainMethod.body && mainMethod.body.body) {
    console.log("Main statements:");
    mainMethod.body.body.forEach((stmt, idx) => {
      console.log(`[${idx}] ${stmt.type}:`, JSON.stringify(stmt, null, 2).substring(0, 200));
    });
  }
}
