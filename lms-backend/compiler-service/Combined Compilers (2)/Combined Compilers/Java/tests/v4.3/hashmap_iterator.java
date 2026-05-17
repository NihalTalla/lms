class Test {
    public static void main() {
        HashMap map = new HashMap();
        map.put(1, 100);
        map.put(2, 200);
        map.put(3, 300);
        
        Iterator it = map.iterator();
        while (it.hasNext() == 1) {
            int value = it.next();
            System.out.println(value);
        }
    }
}
