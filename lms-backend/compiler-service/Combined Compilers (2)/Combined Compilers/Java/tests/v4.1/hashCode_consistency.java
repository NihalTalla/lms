class Item {
  int id;
  String name;
  
  Item(int i, String n) {
    id = i;
    name = n;
  }
}

class Test {
  public static void main() {
    Item item1 = new Item(1, "Apple");
    Item item2 = new Item(2, "Banana");
    
    // hashCode() should return consistent values
    int h1 = item1.hashCode();
    int h2 = item2.hashCode();
    int h3 = item1.hashCode();
    
    System.out.println(h1);
    System.out.println(h2);
    System.out.println(h3);
    
    // Same object should have same hash code
    System.out.println(h1 == h3);
  }
}
