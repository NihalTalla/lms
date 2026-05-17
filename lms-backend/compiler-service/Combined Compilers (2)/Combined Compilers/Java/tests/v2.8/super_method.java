class Parent {
  int value() {
    return 100;
  }
}

class Child {
  int value() {
    return 150;
  }
}

class Test {
  public static void main() {
    Child c = new Child();
    System.out.println(c.value());
  }
}
