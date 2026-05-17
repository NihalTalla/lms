class Test {
    public static void main() {
        ArrayList list = new ArrayList();
        list.add(10);
        list.add(20);
        list.add(30);
        
        Iterator it = list.iterator();
        while (it.hasNext() == 1) {
            int value = it.next();
            System.out.println(value);
        }
    }
}
