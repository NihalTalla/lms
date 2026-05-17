# Test function annotations (should be ignored at runtime)
def add(x: int, y: int) -> int:
    return x + y

def greet(name: str) -> str:
    return "Hello " + name

print(add(3, 4))  # should print 7
print(greet("World"))  # should print "Hello World"

# Annotations with defaults
def power(base: int, exp: int = 2) -> int:
    result = 1
    for i in range(exp):
        result = result * base
    return result

print(power(3))  # should print 9
print(power(2, 3))  # should print 8
