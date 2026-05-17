const { tokenize } = require('./java/lexer/lexer');

const code = `sb.toString()`;

const tokens = tokenize(code);
tokens.forEach((t, i) => {
  console.log(`Token ${i}:`);
  console.log(`  type: ${typeof t.type} = ${t.type}`);
  console.log(`  value: ${typeof t.value} = ${t.value}`);
});
