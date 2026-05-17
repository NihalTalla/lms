const VirtualMachine = require("./vm");

// direct VM bytecode test
const bytecode = [
  { op: "LOAD_CONST", arg: 10 },
  { op: "LOAD_CONST", arg: 20 },
  { op: "ADD" },
  { op: "LOAD_CONST", arg: 2 },
  { op: "MUL" },
  { op: "PRINT" },
  { op: "HALT" }
];

const vm = new VirtualMachine(bytecode);
vm.run();
