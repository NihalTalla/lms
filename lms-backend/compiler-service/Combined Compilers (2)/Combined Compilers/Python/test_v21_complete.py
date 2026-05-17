# Test v2.1 - Objects + Data features

# String methods
print("=== String Methods ===")
s = "Hello World"
print(s.upper())
print(s.lower())
words = s.split()
print(words)
result = " ".join(["a", "b", "c"])
print(result)

# Dictionary methods
print("\n=== Dictionary Methods ===")
d = {"a": 1, "b": 2, "c": 3}
keys = d.keys()
print(keys)
values = d.values()
print(values)
items = d.items()
print(items)

# List methods
print("\n=== List Methods ===")
lst = [3, 1, 4, 1, 5]
print(lst.count(1))
print(lst.index(4))
lst.insert(2, 99)
print(lst)
lst.remove(1)
print(lst)
lst.reverse()
print(lst)

# Set methods
print("\n=== Set Methods ===")
s1 = {1, 2, 3}
s1.add(4)
print(len(s1))
s1.remove(2)
print(len(s1))
s2 = {3, 4, 5}
union = s1.union(s2)
print(len(union))
