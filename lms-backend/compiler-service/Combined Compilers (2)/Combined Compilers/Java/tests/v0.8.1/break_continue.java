class Test {
  public static void main() {
    int a = 10;

    while (a > 0) {
      if (a == 5) {
        break;
      } else {
        a = a - 1;
        continue;
      }
    }

    System.out.println(a);
  }
}
