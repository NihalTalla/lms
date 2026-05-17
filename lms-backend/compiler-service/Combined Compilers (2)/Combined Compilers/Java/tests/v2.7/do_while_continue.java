class Main {
  public static void main() {
    int i = 0;
    do {
      i++;
      if (i == 2) {
        continue;
      }
      System.out.println(i);
    } while (i < 4);
  }
}
