class Env {
  constructor(parent = null) {
    this.values = Object.create(null);
    this.parent = parent;
  }

  get(name) {
    if (name in this.values) return this.values[name];
    if (this.parent) return this.parent.get(name);
    throw new Error(`NameError: name '${name}' is not defined`);
  }

  set(name, value) {
    this.values[name] = value;
  }
}

module.exports = Env;
