class Main {
  public static void main() {
    int i = 0;
    do {
      int j = 0;
      do {
        if (j == 1) {
          break;
        }
        System.out.println(i * 10 + j);
        j++;
      } while (j < 3);
      i++;
    } while (i < 2);
  }
}
