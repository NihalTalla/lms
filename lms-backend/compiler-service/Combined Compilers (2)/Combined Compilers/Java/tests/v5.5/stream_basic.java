// v5.5: Streams (basic subset)
class Test {
  public static void main() {
    ArrayList numbers = new ArrayList();
    numbers.add(1);
    numbers.add(2);
    numbers.add(3);
    
    int sum = 0;
    for (int n : numbers) {
      sum = sum + n;
    }
    System.out.println(sum);
  }
}
