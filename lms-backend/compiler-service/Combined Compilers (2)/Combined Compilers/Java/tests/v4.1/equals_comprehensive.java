class Person {
  String name;
  int age;
  
  Person(String n, int a) {
    name = n;
    age = a;
  }
}

class Test {
  public static void main() {
    Person p1 = new Person("Alice", 30);
    Person p2 = new Person("Bob", 25);
    Person p3 = p1;
    
    // equals() - reference equality
    // p1.equals(p2) should be 0 (different objects)
    System.out.println(p1.equals(p2));
    
    // p1.equals(p3) should be 1 (same object reference)
    System.out.println(p1.equals(p3));
    
    // p1.equals(p1) should be 1 (same object)
    System.out.println(p1.equals(p1));
  }
}
