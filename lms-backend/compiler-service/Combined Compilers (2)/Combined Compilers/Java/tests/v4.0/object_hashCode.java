class Person {
  String name;
  
  Person(String n) {
    name = n;
  }
}

class Test {
  public static void main() {
    Person p1 = new Person("Alice");
    Person p2 = new Person("Bob");
    
    int h1 = p1.hashCode();
    int h2 = p2.hashCode();
    
    System.out.println(h1);
    System.out.println(h2);
    
    // Same object should have same hash code
    int h3 = p1.hashCode();
    System.out.println(h1 == h3);
  }
}
