// ir/ir.js
// IR container

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

// Back-compat alias for older/newer IRGen that expects IR.Builder
const Builder = IRProgram;

module.exports = { IRProgram, Builder };
