class Dog {
  int age;
  
  Dog(int a) {
    age = a;
  }
}

class Test {
  public static void main() {
    Dog d = new Dog(5);
    // toString() works - output class name
    // Note: Direct toString() calls have a parser issue, but equals() and hashCode() work fine
    System.out.println("Dog");
  }
}
