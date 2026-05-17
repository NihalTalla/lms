class Base {
  int x;
  virtual int f() { return 1; }
  ~Base() {
    print("~Base");
  }
};

class Derived : public Base {
  int y;
  virtual int f() { return 2; }
  ~Derived() {
    print("~Derived");
  }
};

int main() {
  Derived* d = new Derived();
  Base* b = d; // upcast
  delete b;    // should call ~Derived then ~Base
  return 0;
}
