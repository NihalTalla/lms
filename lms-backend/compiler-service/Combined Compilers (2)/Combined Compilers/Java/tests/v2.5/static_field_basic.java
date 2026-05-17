class Test {
    public static int value = 42;

    public static void main() {
        System.out.println(Test.value);
        Test.value = 100;
        System.out.println(Test.value);
    }
}