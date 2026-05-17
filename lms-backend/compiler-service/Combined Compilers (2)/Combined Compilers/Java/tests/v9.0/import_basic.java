// v9.0: Import statements (no enforcement yet, but parsed and validated)
import java.util.ArrayList;
import java.util.HashMap;
import java.io.File;

class Test {
  public static void main() {
    ArrayList list = new ArrayList();
    list.add(100);
    System.out.println(list.get(0));
  }
}
