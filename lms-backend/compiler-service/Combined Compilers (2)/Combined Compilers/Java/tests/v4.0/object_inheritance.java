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
    
    // Both should have equals from Object
    System.out.println(a.equals(a));
    System.out.println(d.equals(d));
    System.out.println(a.equals(d));
    
    // Both should have hashCode from Object
    System.out.println(a.hashCode());
    System.out.println(d.hashCode());
  }
}
