const fs = require("fs");
const { tokenize } = require("./java/lexer/lexer");
const Parser = require("./java/parser/parser");
const generateIR = require("./java/irgen/irgen");

const code = fs.readFileSync("tests/v4.4/foreach_minimal.java", "utf-8");
const tokens = tokenize(code);
const parser = new Parser(tokens);
const ast = parser.parse();
const ir = generateIR(ast);

// Print main method IR
const mainIr = ir.instructions.slice(0, 50);
mainIr.forEach((instr, idx) => {
  console.log(`[${idx}] ${instr.op}${instr.arg !== undefined ? ` ${JSON.stringify(instr.arg)}` : ""}`);
});
