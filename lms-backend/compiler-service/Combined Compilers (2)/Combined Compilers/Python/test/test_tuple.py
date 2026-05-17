# Test tuple support
print("=== TUPLE LITERALS ===")
t1 = (1, 2, 3)
print(t1)

t2 = (1,)
print(t2)  # Single element tuple

t3 = ()
print(t3)  # Empty tuple

print("=== TUPLE INDEXING ===")
print(t1[0])
print(t1[-1])

print("=== TUPLE VS PARENTHESES ===")
x = (1 + 2) * 3  # Should be 9, not a tuple
print(x)

t4 = (1, 2, 3)
print(t4)
