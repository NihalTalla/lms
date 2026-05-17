class RuntimeError extends Error {
  constructor(type, message) {
    super(message);
    this.type = type;
  }

  toString() {
    return `${this.type}: ${this.message}`;
  }
}
class ValueError extends RuntimeError {
  constructor(message) {
    super("ValueError", message);
  }
}

class AttributeError extends RuntimeError {
  constructor(message) {
    super("AttributeError", message);
  }
}

function ValueErrorR(msg) {
  return new ValueError(msg);
}

function AttributeErrorR(msg) {
  return new AttributeError(msg);
}

const TypeErrorR = (msg) =>
  new RuntimeError("TypeError", msg);

const IndexErrorR = (msg) =>
  new RuntimeError("IndexError", msg);

const ZeroDivisionErrorR = (msg) =>
  new RuntimeError("ZeroDivisionError", msg);

module.exports = {
  RuntimeError,
  TypeErrorR,
  IndexErrorR,
  ZeroDivisionErrorR,
  ValueErrorR,
  AttributeErrorR
};

