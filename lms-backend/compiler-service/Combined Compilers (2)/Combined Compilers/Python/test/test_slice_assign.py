# Test slice assignment
print("=== SLICE ASSIGNMENT ===")
lst = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
print(lst)

lst[1:3] = [10, 11]
print(lst)  # [0, 10, 11, 3, 4, 5, 6, 7, 8, 9]

lst[0:2] = [20]
print(lst)  # [20, 11, 3, 4, 5, 6, 7, 8, 9]

lst[5:] = [50, 60]
print(lst)  # [20, 11, 3, 4, 5, 50, 60]

lst[:3] = [1, 2, 3]
print(lst)  # [1, 2, 3, 4, 5, 50, 60]
