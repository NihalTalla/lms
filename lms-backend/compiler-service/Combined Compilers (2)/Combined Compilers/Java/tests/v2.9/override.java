class Shape {
  int area() {
    return 0;
  }
}

class Rectangle {
  int width;
  int height;
  
  Rectangle(int w, int h) {
    width = w;
    height = h;
  }
  
  int area() {
    return width * height;
  }
}

class Test {
  public static void main() {
    Rectangle r = new Rectangle(5, 10);
    System.out.println(r.area());
  }
}
