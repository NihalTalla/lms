print("===== LMS COMPILER MEGA TEST START =====")


# --------------------------------------------------
print("\n--- TOPIC 1: BASIC TYPES & EXPRESSIONS ---")

a = 10
b = 3
s1 = "Hello "
s2 = "World"

print(a + b)
print(a - b)
print(a * b)
print(a / b)
print(a // b)
print(a % b)

print(s1 + s2)
print(True and False)
print(True or False)
print(not False)


# --------------------------------------------------
print("\n--- TOPIC 2: COMPARISONS & CHAINING ---")

x = 5
y = 10
z = 15

print(x < y)
print(y > z)
print(x < y < z)
print(x == 5 and z == 15)
print(x != y)


# --------------------------------------------------
print("\n--- TOPIC 3: IF / ELIF / ELSE ---")

n = 7

if n < 0:
    print("negative")
elif n == 0:
    print("zero")
else:
    print("positive")


# --------------------------------------------------
print("\n--- TOPIC 4: WHILE LOOP + BREAK / CONTINUE / ELSE ---")

i = 0
while i < 5:
    i = i + 1
    if i == 2:
        continue
    if i == 4:
        break
    print(i)
else:
    print("loop completed normally")


# --------------------------------------------------
print("\n--- TOPIC 5: FOR LOOP WITH RANGE ---")

for i in range(1, 6, 2):
    print(i)
else:
    print("for loop done")


# --------------------------------------------------
print("\n--- TOPIC 6: LISTS, INDEX, SLICE ---")

lst = [1, 2, 3, 4, 5]
print(lst)
print(lst[0])
print(lst[1:4])
print(lst[::2])

lst[2] = 99
lst[1:3] = [7, 8]
print(lst)


# --------------------------------------------------
print("\n--- TOPIC 7: LIST METHODS ---")

lst.append(100)
print(lst)

lst.pop()
print(lst)

lst.insert(1, 42)
print(lst)

lst.remove(42)
print(lst)

lst.reverse()
print(lst)

lst.sort()
print(lst)


# --------------------------------------------------
print("\n--- TOPIC 8: TUPLES, DICTS, SETS ---")

t = (1, 2, 3)
print(t)

d = {"a": 1, "b": 2}
print(d)
print(d.keys())
print(d.values())

s = {1, 2, 3}
s.add(4)
print(s)


# --------------------------------------------------
print("\n--- TOPIC 9: COMPREHENSIONS ---")

nums = [1, 2, 3, 4, 5]

squares = [x * x for x in nums]
print(squares)

even_squares = [x * x for x in nums if x % 2 == 0]
print(even_squares)

dict_comp = {x: x * x for x in nums if x > 2}
print(dict_comp)

set_comp = {x for x in nums if x % 2 == 1}
print(set_comp)


# --------------------------------------------------
print("\n--- TOPIC 10: FUNCTIONS, DEFAULTS, KEYWORDS ---")

def add(a, b=5):
    return a + b

print(add(3))
print(add(3, 7))
print(add(b=10, a=2))


# --------------------------------------------------
print("\n--- TOPIC 11: FUNCTION VALUES & CLOSURES ---")

def outer(x):
    def inner(y):
        return x + y
    return inner

f = outer(10)
print(f(5))


# --------------------------------------------------
print("\n--- TOPIC 12: GLOBAL & NONLOCAL ---")

g = 100

def test_scope():
    global g
    g = g + 1

    x = 5
    def inner():
        nonlocal x
        x = x + 1
        return x

    return inner()

print(test_scope())
print(g)


# --------------------------------------------------
print("\n--- TOPIC 13: CLASSES, OBJECTS, METHODS ---")

class Person:
    def __init__(self, name):
        self.name = name

    def greet(self):
        return "Hello " + self.name

p = Person("Jay")
print(p.greet())


# --------------------------------------------------
print("\n--- TOPIC 14: INHERITANCE & SUPER ---")

class Student(Person):
    def __init__(self, name, roll):
        super().__init__(name)
        self.roll = roll

    def info(self):
        return self.name + " #" + str(self.roll)

s = Student("Max", 42)
print(s.info())


# --------------------------------------------------
print("\n--- TOPIC 15: TRY / EXCEPT / FINALLY ---")

try:
    a = 10 / 0
except ZeroDivisionError as e:
    print("caught zero division")
finally:
    print("finally executed")


# --------------------------------------------------
print("\n--- TOPIC 16: ASSERT & RAISE ---")

def positive(x):
    assert x > 0, "must be positive"
    if x == 13:
        raise "unlucky"
    return x

print(positive(5))

try:
    positive(13)
except:
    print("caught custom raise")


# --------------------------------------------------
print("\n--- TOPIC 17: BUILTINS ---")

print(len([1, 2, 3]))
print(int("123"))
print(str(456))


print("\n===== LMS COMPILER MEGA TEST END =====")
