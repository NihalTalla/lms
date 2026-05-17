class Animal {
  String sound() {
    return "Some sound";
  }
}

class Dog {
  String sound() {
    return "Woof";
  }
}

class Cat {
  String sound() {
    return "Meow";
  }
}

class Test {
  public static void main() {
    Dog d = new Dog();
    Cat c = new Cat();
    System.out.println(d.sound());
    System.out.println(c.sound());
  }
}
