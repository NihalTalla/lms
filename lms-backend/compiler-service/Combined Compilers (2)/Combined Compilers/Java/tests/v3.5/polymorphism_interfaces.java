class Dog {
  int makeSound() {
    System.out.println(1);
    return 0;
  }
}

class Cat {
  int makeSound() {
    System.out.println(2);
    return 0;
  }
}

class Test {
  public static void main() {
    Dog d = new Dog();
    Cat c = new Cat();
    d.makeSound();
    c.makeSound();
  }
}
