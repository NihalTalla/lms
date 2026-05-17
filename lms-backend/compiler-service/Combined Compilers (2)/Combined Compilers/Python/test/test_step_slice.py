# Test step slicing
print("=== STEP SLICING ===")
lst = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
print(lst[::2])  # Every 2nd element
print(lst[1::2])  # Every 2nd starting from 1
print(lst[::-1])  # Reverse
print(lst[5:2:-1])  # Reverse slice with range

s = "hello"
print(s[::2])  # "hlo"
print(s[::-1])  # "olleh"

print("=== NEGATIVE STEP ===")
print(lst[9:0:-2])  # Every 2nd from end
