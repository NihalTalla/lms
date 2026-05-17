// topic_test_v22_comprehensions.js
// Runs a focused, organized set of v2.2 comprehension tests.
//
// Usage:
//   node topic_test_v22_comprehensions.js
//
const lexer = require('./python/lexer');
const Parser = require('./python/parser');
const irgen = require('./python/irgen');
const lowerIR = require('./ir/ir_lower');
const VM = require('./vm/vm');

function runCase({ topic, name, code }) {
  let output = '';
  const originalLog = console.log;
  const originalWrite = process.stdout.write;

  console.log = (...args) => {
    output += args.join(' ') + '\n';
  };
  process.stdout.write = (str) => {
    output += str;
  };

  try {
    const tokens = lexer(code);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const ir = irgen(ast);
    const bytecode = lowerIR(ir);
    const vm = new VM(bytecode);
    vm.run();
  } catch (e) {
    output += `ERROR: ${e && e.toString ? e.toString() : String(e)}\n`;
  } finally {
    console.log = originalLog;
    process.stdout.write = originalWrite;
  }

  console.log('='.repeat(72));
  console.log(`[TOPIC] ${topic}`);
  console.log(`[CASE ] ${name}`);
  console.log('-'.repeat(72));
  console.log('[CODE]');
  console.log(code.trimEnd());
  console.log('-'.repeat(72));
  console.log('[OUTPUT]');
  process.stdout.write(output);
  if (!output.endsWith('\n')) process.stdout.write('\n');
}

const TOPIC = 'v2.2 Comprehensions';

const cases = [
  {
    topic: TOPIC,
    name: 'List comprehension: squares',
    code: `
nums = [1, 2, 3, 4, 5]
sq = [n * n for n in nums]
print(sq)
`,
  },
  {
    topic: TOPIC,
    name: 'List comprehension: with condition (even)',
    code: `
nums = [1, 2, 3, 4, 5, 6]
evens = [n for n in nums if n % 2 == 0]
print(evens)
`,
  },
  {
    topic: TOPIC,
    name: 'List comprehension: nested expression',
    code: `
words = ["a", "bb", "ccc"]
lengths = [len(w) + 1 for w in words]
print(lengths)
`,
  },
  {
    topic: TOPIC,
    name: 'Dict comprehension: square map',
    code: `
nums = [1, 2, 3, 4]
d = {n: n * n for n in nums}
print(d)
`,
  },
  {
    topic: TOPIC,
    name: 'Dict comprehension: filter + string conversion',
    code: `
nums = [1, 2, 3, 4, 5]
d = {str(n): n for n in nums if n > 3}
print(d)
`,
  },
  {
    topic: TOPIC,
    name: 'Set comprehension: unique first letters',
    code: `
words = ["apple", "apricot", "banana", "blueberry"]
first = {w[0] for w in words}
print(first)
`,
  },
  {
    topic: TOPIC,
    name: 'Set comprehension: derived values with condition',
    code: `
nums = [1, 2, 2, 3, 4, 4, 5]
s = {n * 10 for n in nums if n < 4}
print(s)
`,
  },
];

console.log('Focused Topic Test Runner');
console.log(`Topic: ${TOPIC}`);
console.log(`Cases: ${cases.length}`);
console.log('');

for (const c of cases) runCase(c);

