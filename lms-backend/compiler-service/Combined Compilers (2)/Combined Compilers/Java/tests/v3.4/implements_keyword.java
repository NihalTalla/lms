class Document {
  int pages;
  
  Document(int p) {
    pages = p;
  }
  
  int print() {
    System.out.println(pages);
    return 0;
  }
}

class Test {
  public static void main() {
    Document d = new Document(10);
    d.print();
  }
}
