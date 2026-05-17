class Test {
    public static void main() {
        HashMap map = new HashMap();
        map.put(1, 100);
        map.put(2, 200);
        map.put(3, 300);
        
        System.out.println(map.size());
        System.out.println(map.get(1));
        System.out.println(map.get(2));
        System.out.println(map.get(3));
        System.out.println(map.containsKey(1));
        System.out.println(map.containsKey(4));
    }
}
