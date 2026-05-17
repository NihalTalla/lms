class Animal:
    def speak(self):
        return "sound"

a = Animal()
print(a.speak())

class Dog(Animal):
    def speak(self):
        return "woof"

d = Dog()
print(d.speak())
