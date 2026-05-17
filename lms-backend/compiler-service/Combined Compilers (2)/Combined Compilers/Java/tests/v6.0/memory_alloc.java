// v6.0: Memory safety
class Animal {
  int age;
  
  Animal(int a) {
    age = a;
  }
}

class Test {
  public static void main() {
    Animal a = new Animal(5);
    System.out.println(2);
  }
}
