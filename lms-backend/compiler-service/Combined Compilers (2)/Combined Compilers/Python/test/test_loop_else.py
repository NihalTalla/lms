# Test for/while...else
print("=== FOR...ELSE (normal completion) ===")
for i in range(3):
    print(i)
else:
    print("Loop completed normally")

print("=== FOR...ELSE (with break) ===")
for i in range(5):
    if i == 3:
        break
    print(i)
else:
    print("This should NOT print")

print("=== WHILE...ELSE (normal completion) ===")
i = 0
while i < 3:
    print(i)
    i = i + 1
else:
    print("While loop completed normally")

print("=== WHILE...ELSE (with break) ===")
i = 0
while i < 5:
    if i == 2:
        break
    print(i)
    i = i + 1
else:
    print("This should NOT print")
