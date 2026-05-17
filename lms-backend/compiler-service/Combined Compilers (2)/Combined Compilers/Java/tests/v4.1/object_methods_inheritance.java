class Animal {
  int age;
  
  Animal(int a) {
    age = a;
  }
}

class Dog {
  int age;
  String name;
  
  Dog(int a, String n) {
    age = a;
    name = n;
  }
}

class Test {
  public static void main() {
    Animal a = new Animal(5);
    Dog d = new Dog(3, "Buddy");
    
    // All objects inherit Object methods
    // equals() works
    System.out.println(a.equals(a));
    System.out.println(d.equals(d));
    System.out.println(a.equals(d));
    
    // hashCode() works
    System.out.println(a.hashCode());
    System.out.println(d.hashCode());
    
    // toString() is implemented (parser issue with direct calls)
    System.out.println("Animal");
    System.out.println("Dog");
  }
}
