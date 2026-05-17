// v7.4: Object casting
class Animal {
  public void sound() {
    System.out.println(1);
  }
}

class Dog extends Animal {
  public void bark() {
    System.out.println(2);
  }
}

class Test {
  public static void main() {
    Animal a = new Dog();
    System.out.println(4);
  }
}
