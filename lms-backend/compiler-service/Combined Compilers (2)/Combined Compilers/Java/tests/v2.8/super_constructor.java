class Base {
  int x;
  
  Base(int val) {
    x = val;
  }
}

class Derived {
  int x;
  int y;
  
  Derived(int a, int b) {
    x = a;
    y = b;
  }
  
  int getX() {
    return x;
  }
  
  int getY() {
    return y;
  }
}

class Test {
  public static void main() {
    Derived d = new Derived(10, 20);
    System.out.println(d.getX());
    System.out.println(d.getY());
  }
}
