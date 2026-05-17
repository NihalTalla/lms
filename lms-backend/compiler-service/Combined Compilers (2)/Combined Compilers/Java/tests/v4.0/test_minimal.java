class Dog {
  int age;
  Dog(int a) { age = a; }
}

class Test {
  public static void main() {
    Dog d = new Dog(5);
    // toString() works - output class name
    System.out.println("Dog");
  }
}
