class RuntimeError extends Error {
  constructor(name, message) {
    super(message);
    this.name = name;
  }

  toString() {
    return `${this.name}: ${this.message}`;
  }
}

function TypeErrorR(message) {
  return new RuntimeError("TypeError", message);
}

function IndexErrorR(message) {
  return new RuntimeError("IndexError", message);
}

function ZeroDivisionErrorR(message) {
  return new RuntimeError("ZeroDivisionError", message);
}

module.exports = {
  RuntimeError,
  TypeErrorR,
  IndexErrorR,
  ZeroDivisionErrorR
};
