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
    
    // Test equals - should be 0 (different objects)
    System.out.println(p1.equals(p2));
    
    // Test equals - should be 1 (same object)
    System.out.println(p1.equals(p1));
    
    // Test hashCode
    int h1 = p1.hashCode();
    int h2 = p2.hashCode();
    System.out.println(h1);
    System.out.println(h2);
  }
}
