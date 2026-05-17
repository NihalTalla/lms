class Counter {
    public static int count = 100;

    public static void increment() {
        count = count + 1;
    }

    public static void main() {
        System.out.println(Counter.count);     // 100
        Counter.increment();
        System.out.println(Counter.count);     // 101

        Counter c = new Counter();
        System.out.println(c.count);           // 101 (allowed in Java)
        c.count = 500;
        System.out.println(Counter.count);     // 500
    }
}
