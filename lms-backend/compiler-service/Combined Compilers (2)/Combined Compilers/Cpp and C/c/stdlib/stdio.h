// stdio.h — Standard I/O for this C compiler
// printf / scanf and friends are lowered at compile-time by irgen.js.

#ifndef STDIO_H
#define STDIO_H

// ── File descriptors / stream handles ───────────────────────────────────────
#define stdin   0
#define stdout  1
#define stderr  2
#define EOF     (-1)

// ── Common integer limits (also in limits.h) ─────────────────────────────────
#define INT_MAX     2147483647
#define INT_MIN     (-2147483648)
#define UINT_MAX    4294967295u
#define LONG_MAX    9223372036854775807
#define LONG_MIN    (-9223372036854775808)
#define LLONG_MAX   9223372036854775807
#define LLONG_MIN   (-9223372036854775808)

// ── NULL ─────────────────────────────────────────────────────────────────────
#ifndef NULL
#define NULL 0
#endif

// ── Boolean (pre-C99 compat) ──────────────────────────────────────────────────
#ifndef __BOOL_DEFINED
#define __BOOL_DEFINED
#define bool  int
#define true  1
#define false 0
#endif

// ── Formatted I/O (variadic — handled specially in irgen.js) ─────────────────
// Declarations are provided so the preprocessor/parser sees them.
// Actual lowering to PRINT_INLINE / readInt / etc. happens in irgen.js.

#endif // STDIO_H
