class Dog {
  int age;
  
  Dog(int a) {
    age = a;
  }
  
  String getString() {
    return "Dog";
  }
}

class Test {
  public static void main() {
    Dog d = new Dog(5);
    System.out.println(d.getString());
  }
}
