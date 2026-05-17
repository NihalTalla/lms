class Test {
  static int add(int a) { return a; }
  static int add(int a, int b) { return a + b; }

  public static void main() {
    System.out.println(add(5));
    System.out.println(add(3, 4));
  }
}
