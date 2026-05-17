print("=== BASIC EXPRESSIONS ===")
a = 10
b = 3
print(a + b)
print(a - b)
print(a * b)
print(a / b)
print(a // b)
print(a % b)

print("=== UNARY OPS ===")
print(-a)
print(not False)
print(not (a < b))

print("=== LOGICAL OPS ===")
print(True and False)
print(True or False)
print(not True)

print("=== IF / ELSE ===")
x = 7
if x > 5:
    print("x is greater than 5")
else:
    print("x is small")

print("=== WHILE LOOP ===")
i = 0
while i < 5:
    print(i)
    i = i + 1

print("=== WHILE WITH BREAK ===")
i = 0
while True:
    if i == 3:
        break
    print(i)
    i = i + 1

print("=== WHILE WITH CONTINUE ===")
i = 0
while i < 6:
    i = i + 1
    if i % 2 == 0:
        continue
    print(i)

print("=== FOR LOOP RANGE(START, END) ===")
for i in range(1, 5):
    print(i)

print("=== FOR LOOP RANGE(START, END, STEP) ===")
for i in range(10, 0, -2):
    print(i)

print("=== FOR WITH BREAK ===")
for i in range(5):
    if i == 3:
        break
    print(i)

print("=== FOR WITH CONTINUE ===")
for i in range(6):
    if i % 2 == 0:
        continue
    print(i)

print("=== FUNCTIONS ===")
def add(x, y):
    return x + y

print(add(3, 4))

print("=== FUNCTION WITHOUT RETURN VALUE ===")
def say_hi():
    print("Hi from function")

say_hi()

print("=== RECURSION (FACTORIAL) ===")
def fact(n):
    if n == 0:
        return 1
    return n * fact(n - 1)

print(fact(5))

print("=== LIST CREATION ===")
lst = [1, 2, 3]
print(lst)

print("=== LIST INDEXING ===")
print(lst[0])
print(lst[-1])

print("=== LIST ASSIGNMENT ===")
lst[1] = 99
print(lst)

print("=== LIST SLICING ===")
print(lst[1:3])
print(lst[:2])
print(lst[1:])
print(lst[-3:-1])

print("=== STRING SLICING ===")
s = "compiler"
print(s[0:4])
print(s[1:])
print(s[:5])
print(s[-4:-1])

print("=== LEN FUNCTION ===")
print(len(lst))
print(len(s))


print("=== NESTED LOOPS ===")
for i in range(3):
    for j in range(3):
        if j == 1:
            continue
        print(i * 10 + j)

print("=== BREAK INSIDE FUNCTION ===")
def test_break():
    for i in range(10):
        if i == 4:
            break
    return i

print(test_break())

print("=== CONTINUE INSIDE FUNCTION ===")
def test_continue():
    s = 0
    for i in range(5):
        if i == 2:
            continue
        s = s + i
    return s

print(test_continue())

print("=== GLOBAL VS LOCAL ===")
x = 100
def shadow():
    x = 5
    return x

print(shadow())
print(x)

print("=== PRINT_INLINE ===")
print_inline("Hello ")
print_inline("World")
print("!")

print("=== DONE ===")
print("=== NONLOCAL ===")

def outer():
    x = 10
    def inner():
        nonlocal x
        x = x + 5
    inner()
    return x

print(outer())  # should print 15
print("=== GLOBAL ===")

x = 10

def change_global():
    global x
    x = x + 5

change_global()
print(x)    # should print 15
print("=== GLOBAL SHADOWING ===")

x = 100

def f():
    global x
    x = 50

def g():
    x = 999
    return x

f()
print(x)    # should print 50
print(g())  # should print 999
print(x)    # should still print 50
print("=== DEFAULT PARAMETERS ===")
def add(a, b=3,c=45):
    print(a + b+c)

add(2,4)
add(1,2,3)
