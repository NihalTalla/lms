<!-- goals.md -->
# C Compiler Goals (Competitive Programming Grade)

This document lists the features and engineering goals needed for a **C compiler** to be “competitive programming grade”: fast compile-run cycles, good diagnostics, correct enough for typical CP C code, and a runtime/stdlib that supports common patterns.

---

## 1) Language Coverage (C Subset + Extensions CP uses)

### 1.1 Core C (must-have)
- **Translation unit**
  - Multiple top-level declarations: globals, functions, structs, typedefs.
- **Types**
  - `void`, `char`, `short`, `int`, `long`, `long long`
  - signed/unsigned variants
  - `float`, `double` (at least `double` for CP)
  - `_Bool` (or `bool` as extension)
  - Pointers, arrays, function types
  - `struct` (tag + anonymous), `union` (optional but useful), `enum`
- **Qualifiers**
  - `const`, `volatile` (volatile can be parsed but treated as no-op at CP grade)
  - `restrict` (parse-only acceptable)
- **Expressions**
  - Full operator set (including bitwise and shifts)
  - Pre/post inc/dec
  - Ternary `?:`
  - Comma operator
  - Casts
  - `sizeof` (type and expr)
- **Statements**
  - `if/else`, `switch/case/default`
  - loops: `for`, `while`, `do-while`
  - `break`, `continue`, `return`, `goto` (goto optional but common in low-level snippets)
  - compound blocks with declarations interleaved (C99+ style)
- **Functions**
  - Prototypes, definitions, recursion
  - Parameter passing (value), variadic (nice-to-have but can be deferred)
- **Initializers**
  - Scalars, arrays, structs
  - Brace initializers (`int a[3]={1,2,3};`)
  - Zero-initialization when partially specified
- **String literals**
  - Escape sequences; concatenation `"a" "b"` (C feature)
- **Integer/float literals**
  - Hex, octal, decimal; suffix handling (`U`, `LL`, etc.) (full suffixes nice-to-have)

### 1.2 CP-leaning extensions (high ROI)
- `//` comments (C99)
- `inline` (can be ignored semantically)
- `__attribute__` parse-ignore (or reject with clear diagnostic)
- `#include`, `#define` (preprocessor) — very important for CP
- `stdio`-like fast IO helpers (even if not true libc)

---

## 2) Preprocessor (Critical for CP)

### 2.1 Minimum viable preprocessor (must-have)
- `#include "..."` and `#include <...>` (at least local includes)
- `#define` object-like and function-like macros
- Macro expansion (including nested expansion)
- `#if`, `#ifdef`, `#ifndef`, `#elif`, `#else`, `#endif`
- `defined(X)` operator
- Line continuation with `\`
- Preserve reasonable `#line` / source locations for diagnostics

### 2.2 Nice-to-have
- `#pragma once` (or ignore)
- Token-pasting `##` and stringizing `#`
- Variadic macros

---

## 3) Semantics and Type System Correctness

### 3.1 Type rules (must-have)
- Integer promotions and usual arithmetic conversions
- Pointer arithmetic (add/sub with integer; subtraction between pointers in same array)
- Lvalue/rvalue rules (including array-to-pointer decay and function-to-pointer decay)
- Assignment conversions (including `const` restrictions where relevant)
- Comparison rules (integer, floating, pointer)
- Implicit conversions for function call arguments
- `sizeof` evaluation (compile-time)
- Struct layout model (field offsets); alignment (simplified acceptable if consistent)

### 3.2 Control flow rules
- Reachability: warn/error on unreachable after `return`/`throw` (if supported)
- Definite return: warn if non-void function can fall through
- Switch fallthrough support and diagnostics (optional warnings)

### 3.3 Diagnostics quality (must-have)
- Accurate line/column, underline spans
- Clear error messages (unknown symbol, type mismatch, invalid lvalue, etc.)
- Helpful hints (e.g., “did you mean …” optional)

---

## 4) Backend / Codegen Goals (for your VM + IR)

### 4.1 IR capability checklist
- Arithmetic ops: int and float
- Bitwise: `& | ^ ~ << >>`
- Comparisons: `== != < <= > >=`
- Branching: conditional/unconditional jumps
- Function call/return with arguments
- Local variables, global variables
- Address-of, dereference
- Load/store through pointers
- Field access via offsets
- Array indexing via pointer arithmetic (or dedicated ops)
- Constant folding hooks (or separate optimizer pass)

### 4.2 Runtime model decisions (important)
Pick a consistent model for:
- Memory (stack/heap), pointer representation
- Struct value semantics vs reference semantics
- Array storage and pointer arithmetic
- String literals storage (read-only segment)

For CP grade, priority is:
- predictable behavior
- enough correctness for typical problems
- speed acceptable for medium-sized sources

---

## 5) Standard Library / Builtins (CP essentials)

### 5.1 I/O (must-have)
- `putchar`, `puts`, `printf` subset (optional)
- `getchar`, `scanf` subset (optional)
- **Fast IO helpers**:
  - `readInt()`, `readLong()`, `readDouble()`
  - `writeInt(x)`, `writeLong(x)`, newline printing
- Buffering for input/output

### 5.2 Utilities (high ROI)
- `malloc`, `free`, `realloc` (or a simple arena allocator)
- `memset`, `memcpy`, `memcmp`
- `strlen`, `strcmp`
- `qsort` (optional)
- Math: `abs`, `llabs`, `sqrt` (optional)

### 5.3 Data structures often used in CP
(If you don’t implement full libc, provide small equivalents)
- dynamic array/vector-like helpers
- hash map (optional)
- priority queue (optional)

---

## 6) Performance Targets

### 6.1 Compile-time
- Tokenization + preprocessing handles 10k–100k LOC quickly
- Avoid quadratic parsing or symbol lookup hot spots
- Cache includes (preprocessor) if possible

### 6.2 Runtime
- Competitive enough for common CP constraints
- Fast IO dominates: ensure IO is optimized
- Avoid excessive allocations in runtime if possible

---

## 7) Tooling / UX

### 7.1 CLI
- `cc try.c` or `node c/run.js` equivalents
- Flags:
  - `-O0/-O1/-O2` (even if only O0/O1 initially)
  - `-Wall` (basic warnings)
  - `-E` (preprocess only)
  - `--dump-tokens`, `--dump-ast`, `--dump-ir`
- Exit codes: non-zero on compile errors

### 7.2 Test suite (must-have)
- Unit tests for lexer/parser/sema/irgen
- Golden tests for diagnostics
- CP micro-benchmarks (IO heavy, loops, arrays, sorting)

---

## 8) Conformance Strategy (practical CP grade)

CP-grade target is not full C17 conformance; it is:
- **C99-ish** coverage
- deterministic behavior on common patterns
- good enough diagnostics
- robust preprocessing and IO

---

## 9) Feature Roadmap (Suggested Phases)

### Phase 0 (bring-up / already in progress)
- Lexer, parser, AST
- Basic sema for ints/floats, functions, if/while/for, return
- IR gen and execution
- Builtin `print` works via IR `PRINT`

### Phase 1 (CP minimum)
- Preprocessor: include/define/if
- Arrays + pointer arithmetic
- `break` / `continue`
- Bitwise ops + shifts
- `switch/case`
- Struct field offsets and pointer-to-struct `->`
- Basic `malloc/free`, `memset/memcpy`
- Fast IO builtins

### Phase 2 (polish + coverage)
- Better numeric types (long long, unsigned)
- `typedef`, `enum`, `union` (union optional)
- Initializer lists for arrays/structs
- Ternary operator, comma operator
- `do-while`, `goto` (optional)
- Constant folding + tiny optimizations

### Phase 3 (quality)
- Better diagnostics with spans and notes
- Warning system (`-Wall`)
- Optimization pass `-O1` (dead code elim, const fold, peepholes)

---

## 10) Acceptance Checklist (CP Grade)

A compiler is “CP grade” when it can compile and run:
- typical Codeforces/AtCoder style C solutions
- fast IO solutions
- array-heavy and pointer-heavy code
- sorting and graph algorithms
- struct-based adjacency lists
- macro-heavy templates (via preprocessor)

Minimum example programs it must handle:
- BFS/DFS on adjacency list
- Dijkstra with binary heap
- Segment tree / BIT
- String hashing
- Sorting with custom comparator (optional)
- Math-heavy loops with long long and mod arithmetic
