a = 10
b = 3
print(a + b)
print(a - b)
print(a * b)
print(a / b)
print(a % b)
print(a // b)
print(a > b)
print(a < b)
print(a == b)
print(a != b)
print(a >= 10)
print(b <= 3)
print(a > b and b == 3)
print(a < b or b == 3)
print(not (a == b))

x = 0
if x > 0:
    print(1)
elif x == 0:
    print(0)
else:
    print(-1)

i = 0
while i < 3:
    print(i)
    i = i + 1

i = 1
while i <= 3:
    j = 1
    while j <= i:
        print(j)
        j = j + 1
    i = i + 1

i = 0
while i < 10:
    if i == 4:
        break
    print(i)
    i = i + 1

i = 0
while i < 6:
    i = i + 1
    if i == 3:
        continue
    print(i)

arr = [10, 20, 30, 40]
print(arr[0])
print(arr[3])

arr[1] = 99
print(arr[1])

i = 0
mx = arr[0]
while i < 4:
    if arr[i] > mx:
        mx = arr[i]
    i = i + 1
print(mx)

def add(x, y):
    return x + y

print(add(5, 7))

def sign(n):
    if n > 0:
        return 1
    elif n == 0:
        return 0
    else:
        return -1

print(sign(10))
print(sign(0))
print(sign(-5))

def fact(n):
    if n == 0:
        return 1
    return n * fact(n - 1)

print(fact(5))

def fib(n):
    if n <= 1:
        return n
    return fib(n - 1) + fib(n - 2)

print(fib(6))

n = 1234
c = 0
while n > 0:
    n = n // 10
    c = c + 1
print(c)

n = 5
s = 0
i = 1
while i <= n:
    s = s + i
    i = i + 1
print(s)

n = 7
i = 2
isPrime = 1
while i < n:
    if n % i == 0:
        isPrime = 0
        break
    i = i + 1
print(isPrime)
