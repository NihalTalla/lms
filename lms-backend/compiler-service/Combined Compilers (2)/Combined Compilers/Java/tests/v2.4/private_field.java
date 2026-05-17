class Main {
  private int x;
  Main() {
    this.x = 42;
  }
  public static void main() {
    Main m = new Main();
    System.out.println(m.x); // Prints 42 (allowed, same class)
  }
}
