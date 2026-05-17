class Circle {
  int radius;
  
  Circle(int r) {
    radius = r;
  }
  
  int draw() {
    System.out.println(radius);
    return 0;
  }
}

class Test {
  public static void main() {
    Circle c = new Circle(5);
    c.draw();
  }
}
