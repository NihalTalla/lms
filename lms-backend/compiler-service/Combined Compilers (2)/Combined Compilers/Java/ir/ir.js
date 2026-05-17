// ir/ir.js

class IRProgram {
  constructor() {
    this.instructions = [];
  }

  emit(op, arg = null) {
    this.instructions.push({ op, arg });
    return this.instructions.length - 1;
  }

  patch(index, value) {
    this.instructions[index].arg = value;
  }
}

module.exports = { IRProgram };
