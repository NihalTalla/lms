class Main {
  public static void main() {
    int[] arr = new int[3];
int i=0;
int sum=0;
    arr[0] = 10;
    arr[1] = 20;
    arr[2] = 30;
while (i < 3) {
      sum = sum + arr[i];
      i = i + 1;
    }

    System.out.println(sum);
    System.out.println(arr[0]);
    System.out.println(arr[1]);
    System.out.println(arr[2]);
  }
}
