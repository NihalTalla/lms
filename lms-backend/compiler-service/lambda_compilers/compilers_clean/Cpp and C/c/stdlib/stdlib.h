// stdlib.h — Standard library for this C compiler

#ifndef STDLIB_H
#define STDLIB_H

// ── NULL ─────────────────────────────────────────────────────────────────────
#ifndef NULL
#define NULL 0
#endif

// ── Sizes ────────────────────────────────────────────────────────────────────
#define RAND_MAX  32767

// ── Integer limits (shared with limits.h) ────────────────────────────────────
#ifndef INT_MAX
#define INT_MAX   2147483647
#define INT_MIN   (-2147483648)
#define LLONG_MAX 9223372036854775807
#define LLONG_MIN (-9223372036854775808)
#endif

// ── Boolean ──────────────────────────────────────────────────────────────────
#ifndef __BOOL_DEFINED
#define __BOOL_DEFINED
#define bool  int
#define true  1
#define false 0
#endif

// ── Memory management, abs, atoi, etc. are registered as builtins ────────────
// (see c/builtins.js — malloc, free, abs, atoi, atof, rand, qsort …)

#endif // STDLIB_H
