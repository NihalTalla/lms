def add(a, b=5):
    return a + b

def outer(x):
    def inner(y):
        return x + y
    return inner

f = outer(10)
print(f(5))
