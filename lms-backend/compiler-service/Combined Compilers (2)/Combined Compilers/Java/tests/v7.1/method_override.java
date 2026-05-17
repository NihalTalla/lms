// v7.1: Method override
class Vehicle {
  public void start() {
    System.out.println(0);
  }
}

class Car extends Vehicle {
  public void start() {
    System.out.println(1);
  }
}

class Test {
  public static void main() {
    Car c = new Car();
    c.start();
  }
}
