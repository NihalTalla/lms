class Simple:
    def __init__(self):
        self.value = 42
    
    def get_value(self):
        return self.value

# Let's just create the instance first
s = Simple()
print("Instance created")
# Now let's try to access an attribute directly
print(s.value)  # Should print 42