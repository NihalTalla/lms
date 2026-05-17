/* test/try.c
   CP-grade C compiler stress test (single file)

   Notes:
   - This file is intentionally broad; it will NOT compile until you implement
     most items in goals.md (preprocessor, arrays, pointers, structs, switch,
     break/continue, bitwise ops, initializer lists, etc.).
   - It is structured so you can progressively enable sections.

   Expected final outputs (when fully supported) are printed in order.
*/

#define ASSERT_EQ(label, got, exp) do { \
  if ((got) != (exp)) { \
    print(-1); /* fail marker */ \
    print(got); \
    print(exp); \
    return 1; \
  } else { \
    print(exp); \
  } \
} while (0)

#define MIN(a,b) ((a) < (b) ? (a) : (b))
#define MAX(a,b) ((a) > (b) ? (a) : (b))
#define ABS(x)   ((x) < 0 ? -(x) : (x))
#define SWAP_INT(a,b) do { int __t = (a); (a) = (b); (b) = __t; } while(0)

typedef unsigned int u32;
typedef long long i64;

enum Mode { M0 = 0, M1 = 1, M2 = 2 };

struct Pair { int a; int b; };
struct Node { int v; struct Node* next; };

int add(int a, int b) { return a + b; }

int fact(int n) {
  if (n <= 1) return 1;
  return n * fact(n - 1);
}

int gcd(int a, int b) {
  while (b != 0) {
    int t = a % b;
    a = b;
    b = t;
  }
  return a;
}

int popcount_u32(u32 x) {
  int c = 0;
  while (x) {
    c += (int)(x & 1u);
    x >>= 1;
  }
  return c;
}

/* insertion sort to stress loops, indexing, assignments */
void isort(int *a, int n) {
  int i = 0;
  for (i = 1; i < n; i++) {
    int key = a[i];
    int j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j = j - 1;
    }
    a[j + 1] = key;
  }
}

int sum_array(int *a, int n) {
  int s = 0, i = 0;
  for (i = 0; i < n; i++) s += a[i];
  return s;
}

/* linked list build + traversal to stress malloc/free and pointers */
struct Node* push_front(struct Node* head, int v) {
  struct Node* n = (struct Node*)malloc(sizeof(struct Node));
  n->v = v;
  n->next = head;
  return n;
}

int list_sum(struct Node* head) {
  int s = 0;
  while (head) {
    s += head->v;
    head = head->next;
  }
  return s;
}

void list_free(struct Node* head) {
  while (head) {
    struct Node* nxt = head->next;
    free(head);
    head = nxt;
  }
}

/* switch stress */
int switch_map(int x) {
  int out = 0;
  switch (x) {
    case 0: out = 7; break;
    case 1: out = 11; break;
    case 2: out = 13; break;
    case 3: out = 17; break;
    default: out = 19;
  }
  return out;
}

/* simple struct ops */
int pair_sum(struct Pair p) { return p.a + p.b; }

int main() {
  /* 1) arithmetic + precedence */
  ASSERT_EQ("arith1", 5 + 7 * 2, 19);
  ASSERT_EQ("arith2", (5 + 7) * 2, 24);
  ASSERT_EQ("mod",  17 % 5, 2);
  ASSERT_EQ("neg",  -(-9), 9);

  /* 2) if/else + logical */
  int x = 10;
  int y = 0;
  if (x > 5 && !y) ASSERT_EQ("logic", 1, 1);
  else ASSERT_EQ("logic", 0, 1);

  /* 3) loops + break/continue */
  int s = 0;
  int i = 0;
  for (i = 0; i < 10; i++) {
    if (i == 3) continue;
    if (i == 8) break;
    s += i;
  }
  /* 0+1+2+4+5+6+7 = 25 */
  ASSERT_EQ("break_continue", s, 25);

  /* 4) functions + recursion */
  ASSERT_EQ("add", add(40, 2), 42);
  ASSERT_EQ("fact", fact(5), 120);
  ASSERT_EQ("gcd", gcd(48, 18), 6);

  /* 5) ternary + macros */
  ASSERT_EQ("min", MIN(9, 4), 4);
  ASSERT_EQ("max", MAX(9, 4), 9);
  ASSERT_EQ("abs", ABS(-123), 123);

  /* 6) bitwise + shifts + unsigned */
  u32 z = 0b101101u;          /* 45 */
  ASSERT_EQ("popcount", popcount_u32(z), 4);
  ASSERT_EQ("shift", (int)(z >> 2), 11);   /* 45>>2 = 11 */
  ASSERT_EQ("and", (int)(z & 0xFu), 13);   /* 45 & 15 = 13 */
  ASSERT_EQ("or",  (int)(z | 2u), 47);     /* 45|2 = 47 */
  ASSERT_EQ("xor", (int)(z ^ 1u), 44);     /* 45^1 = 44 */

  /* 7) switch/case */
  ASSERT_EQ("switch0", switch_map(0), 7);
  ASSERT_EQ("switch3", switch_map(3), 17);
  ASSERT_EQ("switchX", switch_map(99), 19);

  /* 8) arrays + initializer list + indexing */
  int a[8] = { 9, 1, 8, 2, 7, 3, 6, 4 };
  ASSERT_EQ("sum_pre_sort", sum_array(a, 8), 40);

  isort(a, 8);
  /* after sort: 1 2 3 4 6 7 8 9 */
  ASSERT_EQ("sorted_first", a[0], 1);
  ASSERT_EQ("sorted_last",  a[7], 9);
  ASSERT_EQ("sum_post_sort", sum_array(a, 8), 40);

  /* 9) pointers + address-of + dereference */
  int t = 41;
  int *p = &t;
  *p = *p + 1;
  ASSERT_EQ("ptr_deref", t, 42);

  /* 10) struct value semantics + field access */
  struct Pair q;
  q.a = 20;
  q.b = 22;
  ASSERT_EQ("struct_fields", q.a + q.b, 42);
  ASSERT_EQ("struct_by_value", pair_sum(q), 42);

  /* 11) struct pointer + arrow */
  struct Pair *qp = &q;
  qp->a = 10;
  qp->b = 32;
  ASSERT_EQ("struct_arrow", qp->a + qp->b, 42);

  /* 12) typedef + enum */
  enum Mode m = M2;
  ASSERT_EQ("enum", (int)m, 2);

  /* 13) long long arithmetic (common in CP) */
  i64 big = (i64)1000000000LL * (i64)1000000000LL; /* 1e18 */
  /* check last digits (mod) */
  ASSERT_EQ("ll_mod", (int)(big % 97LL), (int)(1000000000000000000LL % 97LL));

  /* 14) malloc/free + linked list */
  struct Node* head = 0;
  head = push_front(head, 10);
  head = push_front(head, 20);
  head = push_front(head, 12);
  ASSERT_EQ("list_sum", list_sum(head), 42);
  list_free(head);

  /* 15) comma operator (often seen in for-loops) */
  int u = 0, v = 0;
  for (u = 0, v = 10; u < 5; u = u + 1, v = v - 1) { }
  ASSERT_EQ("comma", u + v, 10);

  /* 16) do-while */
  int dw = 0;
  do {
    dw++;
  } while (dw < 3);
  ASSERT_EQ("do_while", dw, 3);

  /* 17) goto (optional but sometimes used) */
  int g = 0;
  goto L1;
  g = 999; /* should be skipped */
L1:
  g = 42;
  ASSERT_EQ("goto", g, 42);

  /* Final success marker */
  print(0);
  return 0;
}
