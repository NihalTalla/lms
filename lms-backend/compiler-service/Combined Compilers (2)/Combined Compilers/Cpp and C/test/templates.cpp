// v1.0 templates + imports stress test

import std.io;
import std.math;

template <typename T>
T add(T a, T b) {
  return a + b;
}

int main() {
  int a = 3;
  int b = 9;

  // explicit instantiation
  int m1 = max<int>(a, b);
  // inferred instantiation (single type-param template)
  int m2 = max(a, b);

  int s1 = add<int>(a, b);
  int s2 = add(a, b);

  // stdlib + builtin len
  string line = "hello";
  int n = len(line);

  // use minInt (imported)
  int mi = minInt(m1, m2);

  // assert
  assert(mi == m2);
  print(m1);
  print(m2);
  print(s1);
  print(s2);
  print(n);
  return 0;
}
