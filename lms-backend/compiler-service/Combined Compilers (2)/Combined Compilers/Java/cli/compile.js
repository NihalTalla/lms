const fs = require("fs");
const compileAndRun = require("../java");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node cli/compile.js <file.java>");
  process.exit(1);
}

compileAndRun(fs.readFileSync(file, "utf8"));
