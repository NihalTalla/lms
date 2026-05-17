class Simple:
    def __init__(self):
        self.value = 42
    
    def get_value(self):
        return self.value

s = Simple()
print(s.get_value())  # Should print 42