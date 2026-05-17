class Point {
    int x;
    int y;

    Point(int a, int b) {
        this.x = a;
        this.y = b;
    }

    public static void main() {
        Point p = new Point(7, 42);
        System.out.println(p.x);
        System.out.println(p.y);
    }
}