// v7.1: Class inheritance (extends)
class Animal {
  String name;
  
  Animal(String n) {
    name = n;
  }
}

class Dog extends Animal {
  Dog(String n) {
    super(n);
  }
}

class Test {
  public static void main() {
    Dog d = new Dog("Rex");
    System.out.println(1);
  }
}
