// v6.0: Memory safety checks
class Dog {
  String name;
  
  Dog(String n) {
    name = n;
  }
}

class Test {
  public static void main() {
    Dog d = new Dog("Rex");
    System.out.println(1);
  }
}

