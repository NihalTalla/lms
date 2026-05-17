// v7.3: Abstract method implementation
abstract class Shape {
  abstract int area();
}

class Circle extends Shape {
  int radius;
  
  Circle(int r) {
    radius = r;
  }
  
  int area() {
    return radius * radius * 3;
  }
}

class Test {
  public static void main() {
    Circle c = new Circle(5);
    System.out.println(c.area());
  }
}
