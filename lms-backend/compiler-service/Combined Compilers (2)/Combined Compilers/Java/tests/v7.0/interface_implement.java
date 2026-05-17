// v7.0: Interface implementation
interface Animal {
  void makeSound();
}

class Dog implements Animal {
  public void makeSound() {
    System.out.println(1);
  }
}

class Test {
  public static void main() {
    Dog d = new Dog();
    d.makeSound();
  }
}
