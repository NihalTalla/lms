class Animal:
    def speak(self):
        return "sound"
class Dog(Animal):
    def speak(self):
        return super().speak() + " woof"
d = Dog()
print(d.speak())
