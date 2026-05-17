class Test {
    public static void main() {
        StringBuilder sb = new StringBuilder();
        sb.append("Hello");
        sb.append(" ");
        sb.append("World");
        
        String result = sb.toString();
        System.out.println(result);
        System.out.println(sb.length());
    }
}
