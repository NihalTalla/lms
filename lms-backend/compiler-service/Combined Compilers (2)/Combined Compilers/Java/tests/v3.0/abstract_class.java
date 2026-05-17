class Shape {
  int x;
  int y;
  
  Shape(int a, int b) {
    x = a;
    y = b;
  }
  
  int getX() {
    return x;
  }
}

class Circle {
  int x;
  int y;
  int radius;
  
  Circle(int a, int b, int r) {
    x = a;
    y = b;
    radius = r;
  }
  
  int getX() {
    return x;
  }
}

class Test {
  public static void main() {
    Circle c = new Circle(10, 20, 5);
    System.out.println(c.getX());
  }
}
