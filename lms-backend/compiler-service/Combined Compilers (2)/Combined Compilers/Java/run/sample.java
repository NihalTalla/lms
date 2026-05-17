class Main {
  public static void main() {
    int[] x = new int[7];
int n = x.length;
System.out.println(n);
System.out.println("hello");
System.out.println("am");
    int mod = 10 % 3;
    System.out.println(mod);
String s = "hi";
System.out.println(s);
String s = "abcd";
System.out.println(s.length());

    System.out.println(100);
    int a = 5;
    int b = 10;
    int c = a + b * 2;
    System.out.println(c);

    if (c > 20) {
      System.out.println(1);
    }

    int i = 0;
    while (i < 3) {
      System.out.println(i);
      i = i + 1;
    }

    int[] arr = new int[5];

    arr[0] = 2;
    arr[1] = 4;
    arr[2] = 6;
    arr[3] = 8;
    arr[4] = 10;

    int sum = 0;
    i = 0;
    while (i < 5) {
      sum = sum + arr[i];
      i = i + 1;
    }

    System.out.println(sum);
    System.out.println(arr[3]);
  }
}
