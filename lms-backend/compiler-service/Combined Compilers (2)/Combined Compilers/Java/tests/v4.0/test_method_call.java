class Dog {
  int age;
  
  Dog(int a) {
    age = a;
  }
  
  int getAge() {
    return age;
  }
}

class Test {
  public static void main() {
    Dog d = new Dog(5);
    System.out.println(d.getAge());
  }
}
