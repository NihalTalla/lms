// v6.1: Runtime bounds checks (arrays, nulls)
class Test {
  public static void main() {
    int[] arr = new int[3];
    arr[0] = 10;
    arr[1] = 20;
    arr[2] = 30;
    System.out.println(arr[0]);
  }
}
