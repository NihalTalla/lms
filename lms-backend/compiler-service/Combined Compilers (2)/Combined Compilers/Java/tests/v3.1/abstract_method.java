class Animal {
  int getLegs() {
    return 0;
  }
  
  String getName() {
    return "Animal";
  }
}

class Dog {
  int getLegs() {
    return 4;
  }
  
  String getName() {
    return "Dog";
  }
}

class Test {
  public static void main() {
    Dog d = new Dog();
    System.out.println(d.getLegs());
    System.out.println(d.getName());
  }
}
