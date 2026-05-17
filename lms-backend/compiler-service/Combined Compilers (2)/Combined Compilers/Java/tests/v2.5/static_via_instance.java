class Counter {
    public static int count = 7;

    public static void main() {
        System.out.println(Counter.count);     // 7

        Counter obj = new Counter();
        System.out.println(obj.count);         // 7 (allowed)

        obj.count = 99;
        System.out.println(Counter.count);     // 99
        System.out.println(obj.count);         // 99
    }
}