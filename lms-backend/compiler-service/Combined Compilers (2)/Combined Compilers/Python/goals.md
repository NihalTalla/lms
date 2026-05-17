🚀 Python-like Compiler Roadmap

A step-by-step evolution plan from a stable core language (v1.0)
to a full-featured Python-inspired language (v2.x),
designed to avoid regressions, refactors, and burnout.

🧱 Guiding Principles

No breaking changes once a version is frozen

One major concept per version

Always implement in order:
Parser → AST → IR → VM

If a feature requires objects, it does not belong before v2.0

Prefer correct & boring over clever & fragile

🔒 v1.0 — Core Stable (DONE)

Status: ✅ Released & frozen

Features

Expressions & operators

Control flow: if / else, while, for range

break, continue

Functions & recursion

Global vs local scope

Lists:

creation

indexing

assignment

slicing (positive & negative)

append(), pop()

Strings + slicing

Built-ins: print, print_inline, len, input, int

Runtime error framework

Stack-based VM

Execution safety (step limit)

Explicitly NOT included

dicts

classes

exceptions

imports

comprehensions

lambdas

v1.0 is DSA-safe, teachable, and demo-ready

🔵 PART 1 — Bridge Phase (v1.x)

Goal: prepare the language for objects
without introducing objects yet

🔵 v1.1 — Syntax & Control Polish

Focus: Parser-level features (low runtime risk)

Features

elif (full Python-style chain)

pass statement

Ternary operator

a if condition else b


Chained comparisons

1 < x < 5


Boolean literals as full first-class values

🔵 v1.2 — Functions v2 (Scoping Phase)

⚠️ Most important pre-v2 version

Features

Default arguments

Keyword arguments

Positional + keyword argument mix

Function annotations (ignored at runtime)

Nested functions

global keyword

nonlocal keyword

Closures (lexical scoping)

Once closures work correctly,
classes become much easier to implement.

🔵 v1.3 — Exceptions & Safety
Features

try / except

finally

raise

assert

for / while ... else

🔵 v1.4 — Containers v2 (Still Non-OOP)
Features

Dictionary literals {} (basic)

Tuple support ()

Set support {1, 2, 3}

Step slicing

a[::2], a[::-1]


Slice assignment

a[1:3] = [9, 9]

Notes

No methods yet

Containers are runtime values, not objects

🧱 End of v1.x

At this point, the language has:

real scoping

real containers

real error handling

But still:

❌ no classes

❌ no attribute access

This is the clean boundary before v2.

🟣 PART 2 — v2.0 (Object Model)

⚠️ This is a semantic leap, not just a feature drop

🟣 v2.0 — Core Object System
Features (ONLY these)

class definitions

Object instances

__init__

Instance attributes

Methods (self)

Attribute access

obj.x


Method calls

obj.method()


Single inheritance

Method overriding

super()

__str__, __repr__

Non-goals

❌ comprehensions

❌ imports

❌ stdlib

❌ decorators

❌ advanced syntax

v2.0 must be small, stable, and boring
Bugs here affect everything.

🟣 PART 3 — v2.x (Expansion Phase)

Object model is stable — now we grow safely

🟣 v2.1 — Objects + Data
Features

Dictionary methods: keys, values, items

List methods (beyond append/pop)

Set methods

String methods:

upper, lower, split, join

Attribute-based behavior everywhere

🟣 v2.2 — Comprehensions
Features

List comprehensions

Dict comprehensions

Set comprehensions

🟣 v2.3 — Modules & Runtime
Features

import (single-file only)

import as

Minimal standard library:


math

random

File I/O:

open

read

write

REPL mode

Error tracebacks with line numbers

🟣 v2.4 — Tooling & Optimization

These can be developed in parallel

Developer Tools

AST visualizer

IR dump tool


Bytecode disassembler

Debug mode (step-by-step execution)

Stack effect validation

Dead-code elimination

Language specification document

Test suite framework

🚫 Explicitly NOT before v2.5+

Lambdas

Generators / yield

Async / await

Threads / multiprocessing

Full Python stdlib

C extensions

🧠 Mental Model (Keep This Handy)

v1.x → correctness & foundations

v2.0 → object truth

v2.x → power & polish

Ask one question before adding any feature:

“Does this require objects?”

❌ No → v1.x

✅ Yes → v2.0 or later

🏁 Closing Note
This roadmap is designed to:
avoid refactors
prevent burnout
preserve learning joy
keep the compiler always runnable
You are not “adding features”.
You are designing a language.