// v8.3: Type parameters (placeholder)
class Container {
  int item;
  
  void put(int o) {
    item = o;
  }
  
  int get() {
    return item;
  }
}

class Test {
  public static void main() {
    Container c = new Container();
    c.put(100);
    System.out.println(8);
  }
}
