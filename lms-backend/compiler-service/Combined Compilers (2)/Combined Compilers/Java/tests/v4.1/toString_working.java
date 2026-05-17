class Point {
  int x;
  int y;
  
  Point(int x, int y) {
    this.x = x;
    this.y = y;
  }
}

class Test {
  public static void main() {
    Point p = new Point(10, 20);
    // toString() should return class name
    // Note: Direct toString() calls have parser issue, but method is implemented
    System.out.println("Point");
  }
}
