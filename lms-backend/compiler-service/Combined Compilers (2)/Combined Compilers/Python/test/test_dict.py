# Test dictionary literals
print("=== DICTIONARY LITERALS ===")
d = {"a": 1, "b": 2, "c": 3}
print(d)

print("=== DICTIONARY INDEXING ===")
print(d["a"])
print(d["b"])

print("=== DICTIONARY ASSIGNMENT ===")
d["d"] = 4
print(d)
d["a"] = 10
print(d)

print("=== EMPTY DICTIONARY ===")
empty = {}
print(empty)
empty["key"] = "value"
print(empty)
