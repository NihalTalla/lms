class Test {
  public static void main() {
    int[] a = new int[3];
    a[0] = 10;
    a[1] = 20;
    a[2] = 30;

    if (a.length == 3 && a[1] == 20) {
      System.out.println(a[2]);
    }
  }
}
