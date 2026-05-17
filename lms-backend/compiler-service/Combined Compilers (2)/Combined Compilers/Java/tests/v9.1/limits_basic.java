// v9.1: Memory and resource limit enforcement
class Test {
  public static void main() {
    // Test 1: Normal execution within limits
    int[] small = new int[10];
    for (int i = 0; i < 10; i = i + 1) {
      small[i] = i * 2;
    }
    System.out.println(small[5]);
    
    // Test 2: String manipulation within limits
    String str = "Hello";
    System.out.println(str);
  }
}
