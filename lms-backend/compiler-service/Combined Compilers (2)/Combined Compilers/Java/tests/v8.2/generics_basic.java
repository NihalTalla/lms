// v8.2: Generics (placeholder - using Object)
class Box {
  int value;
  
  void set(int v) {
    value = v;
  }
  
  int get() {
    return value;
  }
}

class Test {
  public static void main() {
    Box b = new Box();
    b.set(42);
    System.out.println(8);
  }
}
