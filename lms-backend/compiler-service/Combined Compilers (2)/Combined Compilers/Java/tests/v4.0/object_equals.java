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
    Point p1 = new Point(10, 20);
    Point p2 = new Point(10, 20);
    Point p3 = p1;
    
    // p1.equals(p2) should be 0 (different objects)
    System.out.println(p1.equals(p2));
    
    // p1.equals(p3) should be 1 (same object)
    System.out.println(p1.equals(p3));
  }
}
