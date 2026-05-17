// compiler/c/types.js
// Canonical C type system used by semantic analysis and IR generation.
//
// Key goals:
// - Provide stable type objects for equality checks.
// - Support pointers and structs in a VM-friendly way (struct fields -> indices).
// - Keep arithmetic/implicit-cast rules intentionally simple for the initial subset.

class CType {
  constructor(kind) {
    this.kind = kind;
  }
  toString() {
    return this.kind;
  }
}

// ------------------------------
// Primitive types
// ------------------------------
class PrimitiveType extends CType {
  constructor(name) {
    super("primitive");
    this.name = name; // "int" | "float" | "void" | "char"
  }
  toString() {
    return this.name;
  }
}

// ------------------------------
// Pointer type
// ------------------------------
class PointerType extends CType {
  constructor(base) {
    super("pointer");
    this.base = base; // CType
  }
  toString() {
    return `${this.base.toString()}*`;
  }
}

// ------------------------------
// Array type (phase 2+)
// Represented as distinct type; sema may decay to pointer in some contexts.
// ------------------------------
class ArrayType extends CType {
  constructor(base, length) {
    super("array");
    this.base = base; // CType
    this.length = length; // number | null (null = unsized)
  }
  toString() {
    return `${this.base.toString()}[${this.length == null ? "" : this.length}]`;
  }
}

// ------------------------------
// Struct type
// A struct has a tag name and a resolved layout with field indices.
// Sizes/alignments are intentionally VM-level (field index based) for now.
// ------------------------------
class StructType extends CType {
  constructor(tag) {
    super("struct");
    this.tag = tag; // string
    this.fields = null; // Array<{ name, type, index }>
    this.fieldMap = null; // Map name -> {type,index}
  }

  isResolved() {
    return Array.isArray(this.fields);
  }

  resolve(fieldsInOrder) {
    // fieldsInOrder: Array<{ name: string, type: CType }>
    const fields = [];
    const fieldMap = new Map();
    for (let i = 0; i < fieldsInOrder.length; i++) {
      const f = { name: fieldsInOrder[i].name, type: fieldsInOrder[i].type, index: i };
      fields.push(f);
      fieldMap.set(f.name, f);
    }
    this.fields = fields;
    this.fieldMap = fieldMap;
  }

  getField(name) {
    if (!this.fieldMap) return null;
    return this.fieldMap.get(name) || null;
  }

  toString() {
    return `struct ${this.tag}`;
  }
}

// ------------------------------
// Type factory / interning
// ------------------------------
class TypeFactory {
  constructor() {
    // Primitives are singletons
    this._int = new PrimitiveType("int");
    this._float = new PrimitiveType("float");
    this._void = new PrimitiveType("void");
    this._char = new PrimitiveType("char");

    // Pointer interning: key = baseId
    this._ptrCache = new Map(); // Map<string, PointerType>

    // Array interning: key = baseId + ":" + length
    this._arrCache = new Map(); // Map<string, ArrayType>

    // Struct interning: key = tag
    this._structs = new Map(); // Map<string, StructType>
  }

  // --- primitives ---
  int() {
    return this._int;
  }
  float() {
    return this._float;
  }
  void() {
    return this._void;
  }
  char() {
    return this._char;
  }

  // Stable id for caching (not exposed)
  _id(t) {
    if (t.kind === "primitive") return `P:${t.name}`;
    if (t.kind === "pointer") return `PTR:${this._id(t.base)}`;
    if (t.kind === "array") return `ARR:${this._id(t.base)}:${t.length == null ? "" : t.length}`;
    if (t.kind === "struct") return `S:${t.tag}`;
    return `?`;
  }

  ptr(base) {
    const key = this._id(base);
    const existing = this._ptrCache.get(key);
    if (existing) return existing;
    const p = new PointerType(base);
    this._ptrCache.set(key, p);
    return p;
  }

  arr(base, length) {
    const key = `${this._id(base)}:${length == null ? "" : length}`;
    const existing = this._arrCache.get(key);
    if (existing) return existing;
    const a = new ArrayType(base, length);
    this._arrCache.set(key, a);
    return a;
  }

  struct(tag) {
    const existing = this._structs.get(tag);
    if (existing) return existing;
    const s = new StructType(tag);
    this._structs.set(tag, s);
    return s;
  }

  hasStruct(tag) {
    return this._structs.has(tag);
  }
}

// ------------------------------
// Type utilities
// ------------------------------
function isPrimitive(t, name = null) {
  if (!t || t.kind !== "primitive") return false;
  return name == null ? true : t.name === name;
}

function isNumeric(t) {
  return isPrimitive(t, "int") || isPrimitive(t, "float") || isPrimitive(t, "char");
}

function isIntegral(t) {
  return isPrimitive(t, "int") || isPrimitive(t, "char");
}

function isVoid(t) {
  return isPrimitive(t, "void");
}

function isPointer(t) {
  return !!t && t.kind === "pointer";
}

function isArray(t) {
  return !!t && t.kind === "array";
}

function isStruct(t) {
  return !!t && t.kind === "struct";
}

function sameType(a, b) {
  // Because TypeFactory interns most types, reference equality will often hold,
  // but we still implement structural fallback.
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.kind !== b.kind) return false;

  if (a.kind === "primitive") return a.name === b.name;
  if (a.kind === "pointer") return sameType(a.base, b.base);
  if (a.kind === "array") return a.length === b.length && sameType(a.base, b.base);
  if (a.kind === "struct") return a.tag === b.tag;
  return false;
}

// ------------------------------
// Simple implicit cast rules (initial subset)
// - int/char can promote to int
// - int can promote to float
// - float stays float
// - pointer only compatible with same pointer base (strict for now)
// ------------------------------
function usualArithmeticConversion(a, b, tf) {
  // returns { left: CType, right: CType, result: CType }
  // For now: float dominates int/char; int dominates char.
  if (isPrimitive(a, "float") || isPrimitive(b, "float")) {
    return { left: tf.float(), right: tf.float(), result: tf.float() };
  }
  // int or char
  return { left: tf.int(), right: tf.int(), result: tf.int() };
}

function canImplicitlyCast(from, to, tf) {
  if (sameType(from, to)) return true;

  // char -> int
  if (isPrimitive(from, "char") && isPrimitive(to, "int")) return true;

  // int/char -> float
  if ((isPrimitive(from, "int") || isPrimitive(from, "char")) && isPrimitive(to, "float")) return true;

  // disallow float -> int implicit for now (can be enabled later)
  // disallow arbitrary pointer conversions for now
  return false;
}

function isAssignable(to, from, tf) {
  // Strict assignment rules for v1:
  // - sameType
  // - allowed implicit numeric promotions (char->int, int->float, char->float)
  // - pointer assignment only if exact same pointer type
  // - null pointer constant: int 0 is assignable to any pointer type (C standard)
  if (sameType(to, from)) return true;

  if (isNumeric(to) && isNumeric(from)) {
    return canImplicitlyCast(from, to, tf);
  }

  // Null pointer constant: any integer is assignable to a pointer (0 = NULL)
  if (isPointer(to) && isNumeric(from)) return true;

  // void* is assignable to/from any pointer (C standard)
  if (isPointer(to) && isPointer(from)) {
    if (to.base && to.base.kind === "primitive" && to.base.name === "void") return true;
    if (from.base && from.base.kind === "primitive" && from.base.name === "void") return true;
    return sameType(to, from);
  }

  return false;
}

module.exports = {
  // Types
  CType,
  PrimitiveType,
  PointerType,
  ArrayType,
  StructType,

  // Factory
  TypeFactory,

  // Utils
  isPrimitive,
  isNumeric,
  isIntegral,
  isVoid,
  isPointer,
  isArray,
  isStruct,
  sameType,

  // Casting / assignment
  usualArithmeticConversion,
  canImplicitlyCast,
  isAssignable,
};
