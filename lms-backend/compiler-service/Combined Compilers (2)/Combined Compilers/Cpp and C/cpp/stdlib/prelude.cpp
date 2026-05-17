// std/prelude.cpp
// Minimal "standard library" surface for the toy C++ compiler.
// This file is automatically prepended to every compilation unit.

// Builtins provided by the VM/runtime:
//   - print(...): statement form
//   - len(x): returns length of string or list
//   - input([prompt]): reads a line
import std.bits.stdcpp;

int abs(int x) {
  if (x < 0) return -x;
  return x;
}

// Simple assert that throws an int on failure (works with try/catch int).
void assert(bool cond) {
  if (!cond) {
    throw 1;
  }
}

// v1.0 templates demo/utilities
template <typename T>
T id(T x) {
  return x;
}

template <typename T>
T max(T a, T b) {
  if (a > b) return a;
  return b;
}
