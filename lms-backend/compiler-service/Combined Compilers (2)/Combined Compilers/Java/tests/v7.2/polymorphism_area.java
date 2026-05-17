// v7.2: Polymorphism
class Shape {
  public int getArea() {
    return 0;
  }
}

class Rectangle extends Shape {
  int width;
  int height;
  
  Rectangle(int w, int h) {
    width = w;
    height = h;
  }
  
  public int getArea() {
    return width * height;
  }
}

class Test {
  public static void main() {
    Rectangle r = new Rectangle(5, 3);
    System.out.println(r.getArea());
  }
}
