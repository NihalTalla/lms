class Counter {
    int count;

    Counter(int start) {
        this.count = start;
    }

    void increment() {
        this.count = this.count + 1;
    }

    int getCount() {
        return this.count;
    }

    public static void main() {
        Counter c = new Counter(5);
        c.increment();
        c.increment();
        System.out.println(c.getCount());  // → 7
    }
}