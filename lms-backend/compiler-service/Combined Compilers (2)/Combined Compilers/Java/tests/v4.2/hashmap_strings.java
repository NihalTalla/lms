class Test {
    public static void main() {
        HashMap map = new HashMap();
        map.put("one", 1);
        map.put("two", 2);
        map.put("three", 3);
        
        System.out.println(map.size());
        System.out.println(map.get("one"));
        System.out.println(map.get("two"));
        System.out.println(map.get("three"));
        System.out.println(map.containsKey("one"));
        System.out.println(map.containsKey("four"));
    }
}
