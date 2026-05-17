class Animal {
  int age;
  
  Animal(int a) {
    age = a;
  }
  
  int getAge() {
    return age;
  }
}

class Dog {
  int age;
  String name;
  
  Dog(int a, String n) {
    age = a;
    name = n;
  }
  
  int getAge() {
    return age;
  }
  
  String getName() {
    return name;
  }
}

class Test {
  public static void main() {
    Dog d = new Dog(5, "Buddy");
    System.out.println(d.getAge());
    System.out.println(d.getName());
  }
}
