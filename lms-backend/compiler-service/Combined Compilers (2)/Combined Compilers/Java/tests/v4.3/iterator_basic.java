class Test {
    public static void main() {
        ArrayList list = new ArrayList();
        list.add(5);
        list.add(15);
        list.add(25);
        
        Iterator it = list.iterator();
        System.out.println(it.hasNext());
        System.out.println(it.next());
        System.out.println(it.hasNext());
        System.out.println(it.next());
        System.out.println(it.hasNext());
        System.out.println(it.next());
        System.out.println(it.hasNext());
    }
}
