// v7.2: Polymorphic collections
class Animal {
  public void sound() {
    System.out.println(0);
  }
}

class Cat extends Animal {
  public void sound() {
    System.out.println(2);
  }
}

class Test {
  public static void main() {
    Cat c = new Cat();
    c.sound();
  }
}
