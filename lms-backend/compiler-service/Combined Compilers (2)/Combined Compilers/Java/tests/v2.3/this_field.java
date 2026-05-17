class Test {
  int x;  // Field

  // Constructor with param shadowing field
  Test(int x) {
    this.x = x;  // Use 'this' to assign to field
  }

  // Instance method using 'this'
  int getX() {
    return this.x;
  }

  public static void main() {
    Test t = new Test(42);
    System.out.println(t.getX());  // Should print 42
    t.x = 100;  // Direct field access
    System.out.println(t.getX());  // Should print 100
  }
}