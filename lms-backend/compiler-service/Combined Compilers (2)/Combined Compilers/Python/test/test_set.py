# Test set support
print("=== SET LITERALS ===")
s1 = {1, 2, 3}
print(s1)

s2 = {1, 2, 2, 3}  # Duplicates should be removed (we'll handle this in display)
print(s2)

s3 = {}
print(s3)  # Empty - this will be a dict, not a set

print("=== SET VS DICT ===")
d = {"a": 1, "b": 2}
print(d)

s = {1, 2, 3}
print(s)
