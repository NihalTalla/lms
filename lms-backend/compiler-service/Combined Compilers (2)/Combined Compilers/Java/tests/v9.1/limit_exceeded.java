// v9.1: Test array length limit enforcement
class Test {
  public static void main() {
    // This should fail with array length limit exceeded
    int[] huge = new int[20000000];  // 20 million elements
    System.out.println(huge.length);
  }
}
