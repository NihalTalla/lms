// Comprehensive feature test suite
const fs = require('fs');
const path = require('path');

const lexer = require('./python/lexer');
const Parser = require('./python/parser');
const irgen = require('./python/irgen');
const lowerIR = require('./ir/ir_lower');
const VM = require('./vm/vm');

const testResults = {
  passed: [],
  failed: [],
  errors: []
};

function runTest(name, code, expectedOutput = null) {
  try {
    const tokens = lexer(code);
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const ir = irgen(ast);
    const bytecode = lowerIR(ir);
    
    let output = '';
    const originalLog = console.log;
    const originalWrite = process.stdout.write;
    
    console.log = (...args) => {
      output += args.join(' ') + '\n';
    };
    process.stdout.write = (str) => {
      output += str;
    };
    
    const vm = new VM(bytecode);
    vm.run();
    
    console.log = originalLog;
    process.stdout.write = originalWrite;
    
    if (expectedOutput !== null) {
      const normalizedOutput = output.trim();
      const normalizedExpected = expectedOutput.trim();
      if (normalizedOutput === normalizedExpected) {
        testResults.passed.push(name);
        return true;
      } else {
        testResults.failed.push({
          name,
          expected: normalizedExpected,
          got: normalizedOutput
        });
        return false;
      }
    } else {
      testResults.passed.push(name);
      return true;
    }
  } catch (e) {
    testResults.errors.push({
      name,
      error: e.message,
      stack: e.stack
    });
    return false;
  }
}

console.log('🧪 Testing All Features from goals.md\n');
console.log('='.repeat(60));

// ==================== v1.0 — Core Stable ====================
console.log('\n🔒 v1.0 — Core Stable Features\n');

// Expressions & operators
runTest('v1.0: Basic arithmetic', `
x = 10 + 5
print(x)
`, '15\n');

runTest('v1.0: Comparison operators', `
print(5 < 10)
print(10 > 5)
print(5 == 5)
`, 'True\nTrue\nTrue\n');

// Control flow: if/else
runTest('v1.0: if/else', `
if True:
    print("yes")
else:
    print("no")
`, 'yes\n');

// Control flow: while
runTest('v1.0: while loop', `
i = 0
while i < 3:
    print(i)
    i = i + 1
`, '0\n1\n2\n');

// Control flow: for range
runTest('v1.0: for range', `
for i in range(3):
    print(i)
`, '0\n1\n2\n');

// break, continue
runTest('v1.0: break', `
for i in range(5):
    if i == 2:
        break
    print(i)
`, '0\n1\n');

runTest('v1.0: continue', `
for i in range(5):
    if i == 2:
        continue
    print(i)
`, '0\n1\n3\n4\n');

// Functions & recursion
runTest('v1.0: functions', `
def add(a, b):
    return a + b
print(add(2, 3))
`, '5\n');

runTest('v1.0: recursion', `
def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)
print(fib(5))
`, '5\n');

// Lists
runTest('v1.0: list creation', `
lst = [1, 2, 3]
print(lst[0])
`, '1\n');

runTest('v1.0: list indexing', `
lst = [10, 20, 30]
print(lst[1])
print(lst[-1])
`, '20\n30\n');

runTest('v1.0: list assignment', `
lst = [1, 2, 3]
lst[0] = 99
print(lst[0])
`, '99\n');

runTest('v1.0: list slicing', `
lst = [1, 2, 3, 4, 5]
print(lst[1:3])
print(lst[:2])
print(lst[2:])
`, '[2,3]\n[1,2]\n[3,4,5]\n');

runTest('v1.0: list append', `
lst = [1, 2]
lst.append(3)
print(lst)
`, '[1,2,3]\n');

runTest('v1.0: list pop', `
lst = [1, 2, 3]
x = lst.pop()
print(x)
print(lst)
`, '3\n[1,2]\n');

// Strings + slicing
runTest('v1.0: string slicing', `
s = "hello"
print(s[1:3])
`, 'el\n');

// Built-ins
runTest('v1.0: len', `
print(len([1, 2, 3]))
print(len("abc"))
`, '3\n3\n');

runTest('v1.0: int', `
print(int(3.7))
`, '3\n');

runTest('v1.0: print_inline', `
print_inline("Hello ")
print_inline("World")
print("!")
`, 'Hello World!\n');

// ==================== v1.1 — Syntax & Control Polish ====================
console.log('\n🔵 v1.1 — Syntax & Control Polish\n');

// elif
runTest('v1.1: elif chain', `
x = 2
if x == 1:
    print("one")
elif x == 2:
    print("two")
else:
    print("other")
`, 'two\n');

// pass
runTest('v1.1: pass statement', `
if True:
    pass
print("done")
`, 'done\n');

// Ternary operator
runTest('v1.1: ternary operator', `
x = 5 if True else 10
print(x)
y = 5 if False else 10
print(y)
`, '5\n10\n');

// Chained comparisons
runTest('v1.1: chained comparisons', `
x = 3
print(1 < x < 5)
print(1 < x < 2)
`, 'True\nFalse\n');

// Boolean literals
runTest('v1.1: boolean literals', `
print(True)
print(False)
print(True and False)
`, 'True\nFalse\nFalse\n');

// ==================== v1.2 — Functions v2 ====================
console.log('\n🔵 v1.2 — Functions v2 (Scoping Phase)\n');

// Default arguments
runTest('v1.2: default arguments', `
def greet(name="World"):
    return "Hello, " + name
print(greet())
print(greet("Alice"))
`, 'Hello, World\nHello, Alice\n');

// Keyword arguments
runTest('v1.2: keyword arguments', `
def f(a, b):
    return a + b
print(f(b=2, a=1))
`, '3\n');

// Positional + keyword mix
runTest('v1.2: positional + keyword', `
def f(a, b, c):
    return a + b + c
print(f(1, c=3, b=2))
`, '6\n');

// Nested functions
runTest('v1.2: nested functions', `
def outer():
    def inner():
        return 42
    return inner()
print(outer())
`, '42\n');

// global keyword
runTest('v1.2: global keyword', `
x = 10
def change():
    global x
    x = 20
change()
print(x)
`, '20\n');

// nonlocal keyword
runTest('v1.2: nonlocal keyword', `
def outer():
    x = 10
    def inner():
        nonlocal x
        x = 20
    inner()
    return x
print(outer())
`, '20\n');

// Closures
runTest('v1.2: closures', `
def make_adder(n):
    def adder(x):
        return x + n
    return adder
add5 = make_adder(5)
print(add5(3))
`, '8\n');

// ==================== v1.3 — Exceptions & Safety ====================
console.log('\n🔵 v1.3 — Exceptions & Safety\n');

// try/except
runTest('v1.3: try/except', `
try:
    x = 1 / 0
except:
    print("caught")
`, 'caught\n');

// finally
runTest('v1.3: finally', `
x = 0
try:
    x = 1
except:
    pass
finally:
    print(x)
`, '1\n');

// raise
runTest('v1.3: raise', `
try:
    raise "error"
except:
    print("caught")
`, 'caught\n');

// assert
runTest('v1.3: assert (pass)', `
assert True
print("ok")
`, 'ok\n');

// for/while ... else
runTest('v1.3: for else (no break)', `
for i in range(3):
    print(i)
else:
    print("done")
`, '0\n1\n2\ndone\n');

runTest('v1.3: for else (with break)', `
for i in range(3):
    if i == 1:
        break
    print(i)
else:
    print("done")
`, '0\n');

runTest('v1.3: while else', `
i = 0
while i < 3:
    print(i)
    i = i + 1
else:
    print("done")
`, '0\n1\n2\ndone\n');

// ==================== v1.4 — Containers v2 ====================
console.log('\n🔵 v1.4 — Containers v2\n');

// Dictionary literals
runTest('v1.4: dictionary literals', `
d = {"a": 1, "b": 2}
print(d["a"])
`, '1\n');

// Tuple support
runTest('v1.4: tuple support', `
t = (1, 2, 3)
print(t[0])
`, '1\n');

// Set support
runTest('v1.4: set support', `
s = {1, 2, 3}
print(len(s))
`, '3\n');

// Step slicing
runTest('v1.4: step slicing', `
lst = [0, 1, 2, 3, 4, 5]
print(lst[::2])
print(lst[::-1])
`, '[0,2,4]\n[5,4,3,2,1,0]\n');

// Slice assignment
runTest('v1.4: slice assignment', `
lst = [1, 2, 3, 4, 5]
lst[1:3] = [9, 9]
print(lst)
`, '[1,9,9,4,5]\n');

// ==================== v2.0 — Core Object System ====================
console.log('\n🟣 v2.0 — Core Object System\n');

// class definitions
runTest('v2.0: class definition', `
class Point:
    pass
p = Point()
`, '');

// __init__
runTest('v2.0: __init__', `
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
p = Point(1, 2)
print(p.x)
print(p.y)
`, '1\n2\n');

// Instance attributes
runTest('v2.0: instance attributes', `
class Point:
    def __init__(self):
        self.x = 10
p = Point()
print(p.x)
`, '10\n');

// Methods (self)
runTest('v2.0: methods with self', `
class Counter:
    def __init__(self):
        self.count = 0
    def increment(self):
        self.count = self.count + 1
        return self.count
c = Counter()
print(c.increment())
print(c.increment())
`, '1\n2\n');

// Attribute access
runTest('v2.0: attribute access', `
class Point:
    def __init__(self):
        self.x = 5
p = Point()
print(p.x)
`, '5\n');

// Method calls
runTest('v2.0: method calls', `
class Greeter:
    def greet(self):
        return "Hello"
g = Greeter()
print(g.greet())
`, 'Hello\n');

// Single inheritance
runTest('v2.0: single inheritance', `
class Animal:
    def speak(self):
        return "sound"
class Dog(Animal):
    pass
d = Dog()
print(d.speak())
`, 'sound\n');

// Method overriding
runTest('v2.0: method overriding', `
class Animal:
    def speak(self):
        return "sound"
class Dog(Animal):
    def speak(self):
        return "woof"
d = Dog()
print(d.speak())
`, 'woof\n');

// super()
runTest('v2.0: super()', `
class Animal:
    def speak(self):
        return "sound"
class Dog(Animal):
    def speak(self):
        return super().speak() + " woof"
d = Dog()
print(d.speak())
`, 'sound woof\n');

// __str__
runTest('v2.0: __str__', `
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def __str__(self):
        return "Point(" + str(self.x) + "," + str(self.y) + ")"
p = Point(1, 2)
print(p)
`, 'Point(1,2)\n');

// ==================== v2.1 — Objects + Data ====================
console.log('\n🟣 v2.1 — Objects + Data\n');

// String methods
runTest('v2.1: string upper', `
s = "hello"
print(s.upper())
`, 'HELLO\n');

runTest('v2.1: string lower', `
s = "WORLD"
print(s.lower())
`, 'world\n');

runTest('v2.1: string split', `
s = "a b c"
words = s.split()
print(words)
`, '["a","b","c"]\n');

runTest('v2.1: string join', `
result = " ".join(["a", "b", "c"])
print(result)
`, 'a b c\n');

// Dictionary methods
runTest('v2.1: dict keys', `
d = {"a": 1, "b": 2}
keys = d.keys()
print(keys)
`, '["a","b"]\n');

runTest('v2.1: dict values', `
d = {"a": 1, "b": 2}
values = d.values()
print(values)
`, '[1,2]\n');

runTest('v2.1: dict items', `
d = {"a": 1, "b": 2}
items = d.items()
print(items)
`, '[a,1,b,2]\n');

// List methods
runTest('v2.1: list count', `
lst = [1, 2, 1, 3, 1]
print(lst.count(1))
`, '3\n');

runTest('v2.1: list index', `
lst = [10, 20, 30]
print(lst.index(20))
`, '1\n');

runTest('v2.1: list insert', `
lst = [1, 2, 3]
lst.insert(1, 99)
print(lst)
`, '[1,99,2,3]\n');

runTest('v2.1: list remove', `
lst = [1, 2, 3, 2]
lst.remove(2)
print(lst)
`, '[1,3,2]\n');

runTest('v2.1: list reverse', `
lst = [1, 2, 3]
lst.reverse()
print(lst)
`, '[3,2,1]\n');

runTest('v2.1: list sort', `
lst = [3, 1, 4, 1, 5]
lst.sort()
print(lst)
`, '[1,1,3,4,5]\n');

// Set methods
runTest('v2.1: set add', `
s = {1, 2}
s.add(3)
print(len(s))
`, '3\n');

runTest('v2.1: set remove', `
s = {1, 2, 3}
s.remove(2)
print(len(s))
`, '2\n');

runTest('v2.1: set discard', `
s = {1, 2, 3}
s.discard(2)
s.discard(99)
print(len(s))
`, '2\n');

runTest('v2.1: set union', `
s1 = {1, 2, 3}
s2 = {3, 4, 5}
u = s1.union(s2)
print(len(u))
`, '5\n');

runTest('v2.1: set intersection', `
s1 = {1, 2, 3}
s2 = {2, 3, 4}
i = s1.intersection(s2)
print(len(i))
`, '2\n');

// ==================== v2.2 — Comprehensions ====================
console.log('\n🟣 v2.2 — Comprehensions\n');

// List comprehensions
runTest('v2.2: list comprehension basic', `
squares = [x * x for x in [1, 2, 3, 4, 5]]
print(squares)
`, '[1,4,9,16,25]\n');

runTest('v2.2: list comprehension with if', `
evens = [x for x in [1, 2, 3, 4, 5, 6] if x % 2 == 0]
print(evens)
`, '[2,4,6]\n');

// Dict comprehensions
runTest('v2.2: dict comprehension basic', `
squares = {x: x * x for x in [1, 2, 3, 4]}
print(squares)
`, '{"1":1,"2":4,"3":9,"4":16}\n');

runTest('v2.2: dict comprehension with if', `
evens = {x: x * 2 for x in [1, 2, 3, 4, 5] if x % 2 == 0}
print(evens)
`, '{"2":4,"4":8}\n');

// Set comprehensions
runTest('v2.2: set comprehension basic', `
squares = {x * x for x in [1, 2, 3, 4, 5, 1, 2]}
print(len(squares))
`, '5\n');

runTest('v2.2: set comprehension with if', `
evens = {x for x in [1, 2, 3, 4, 5, 6] if x % 2 == 0}
print(len(evens))
`, '3\n');

// Print results
console.log('\n' + '='.repeat(60));
console.log('\n📊 TEST RESULTS\n');
console.log(`✅ Passed: ${testResults.passed.length}`);
console.log(`❌ Failed: ${testResults.failed.length}`);
console.log(`💥 Errors: ${testResults.errors.length}`);

if (testResults.failed.length > 0) {
  console.log('\n❌ FAILED TESTS:');
  testResults.failed.forEach(test => {
    console.log(`\n  ${test.name}`);
    console.log(`    Expected: ${test.expected}`);
    console.log(`    Got:      ${test.got}`);
  });
}

if (testResults.errors.length > 0) {
  console.log('\n💥 ERRORS:');
  testResults.errors.forEach(test => {
    console.log(`\n  ${test.name}`);
    console.log(`    Error: ${test.error}`);
  });
}

console.log('\n' + '='.repeat(60));
