class Duck {
  int fly() {
    System.out.println(1);
    return 0;
  }
  
  int swim() {
    System.out.println(2);
    return 0;
  }
}

class Test {
  public static void main() {
    Duck d = new Duck();
    d.fly();
    d.swim();
  }
}
