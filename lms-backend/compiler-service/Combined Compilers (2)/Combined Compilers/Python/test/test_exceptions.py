# Test exceptions
print("=== BASIC TRY/EXCEPT ===")
try:
    print("In try block")
    raise "Error occurred"
except:
    print("Caught exception")

print("=== TRY/EXCEPT WITH FINALLY ===")
try:
    print("In try")
    raise "Error"
except:
    print("In except")
finally:
    print("In finally")

print("=== ASSERT ===")
assert True, "This should not raise"
print("Assert passed")

try:
    assert False, "Assertion failed"
except:
    print("Assertion error caught")
