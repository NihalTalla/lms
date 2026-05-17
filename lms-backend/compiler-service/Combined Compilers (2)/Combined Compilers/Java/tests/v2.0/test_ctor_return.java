class Point {
  int x;
  int y;

  Point() {
    this.x = 100;
    this.y = 200;
  }

  public static void main() {
    Point p = new Point();
    System.out.println(p.x);
    System.out.println(p.y);
  }
}