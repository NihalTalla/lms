# Test v1.1 features
print("=== TERNARY OPERATOR ===")
x = 10
result = x if x > 5 else 0
print(result)  # should print 10

result2 = 0 if x < 5 else 20
print(result2)  # should print 20

print("=== BOOLEAN LITERALS ===")
a = True
b = False
print(a)  # should print true
print(b)  # should print false
print(a and b)  # should print false
print(a or b)  # should print true

print("=== CHAINED COMPARISONS ===")
x = 3
print(1 < x < 5)  # should print true
print(1 < x < 2)  # should print false
print(5 < x < 10)  # should print false
