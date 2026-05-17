// cpp/errors.js
class CompileError extends Error {
  constructor(message, loc = null) {
    super(message);
    this.name = "CompileError";
    this.loc = loc && typeof loc.line === "number" && typeof loc.col === "number"
      ? { line: loc.line, col: loc.col }
      : null;
  }
}

module.exports = { CompileError };
