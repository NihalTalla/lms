# Test class functionality
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y
    
    def distance_squared(self):
        return self.x * self.x + self.y * self.y
    
    def get_x(self):
        return self.x
    
    def get_y(self):
        return self.y

p = Point(3, 4)
print(p.distance_squared())  # Should print 25
print(p.get_x())  # Should print 3
print(p.get_y())  # Should print 4

# Test another class
class Calculator:
    def __init__(self):
        self.result = 0
    
    def add(self, value):
        self.result = self.result + value
        return self.result
    
    def get_result(self):
        return self.result

calc = Calculator()
calc.add(5)
print(calc.get_result())  # Should print 5
calc.add(3)
print(calc.get_result())  # Should print 8