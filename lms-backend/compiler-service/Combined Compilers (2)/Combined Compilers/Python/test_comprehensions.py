# Test v2.2 - Comprehensions

# List comprehensions
print("=== List Comprehensions ===")
squares = [x * x for x in [1, 2, 3, 4, 5]]
print(squares)

evens = [x for x in [1, 2, 3, 4, 5, 6] if x % 2 == 0]
print(evens)

# Dict comprehensions
print("\n=== Dict Comprehensions ===")
squares_dict = {x: x * x for x in [1, 2, 3, 4]}
print(squares_dict)

# Set comprehensions
print("\n=== Set Comprehensions ===")
squares_set = {x * x for x in [1, 2, 3, 4, 5, 1, 2]}
print(len(squares_set))
