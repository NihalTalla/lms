class Dog {
  int age;
  
  Dog(int a) {
    age = a;
  }
}

class Test {
  public static void main() {
    Dog d = new Dog(5);
    // Call toString via a variable to work around parser issue
    String s = "Dog";
    System.out.println(s);
  }
}
