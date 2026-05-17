// cpp/namespaces.js
// v1.1: namespace flattening pass.
//
// We keep qualified names (ns::name) so users can refer to them with ::.
// For compatibility with the bundled "stdlib" headers used by the project,
// we also *flatten* the `std` namespace into the global scope (i.e., we add
// an unqualified alias) because the test suite uses `vector`, `map`, `cout`,
// etc. without `std::`.

const AST = require("./ast");

function clone(node) {
  if (node === null || node === undefined) return node;
  if (Array.isArray(node)) return node.map(clone);
  if (typeof node !== "object") return node;
  const out = Object.create(Object.getPrototypeOf(node));
  for (const k of Object.keys(node)) out[k] = clone(node[k]);
  return out;
}

function qualifyName(prefix, name) {
  if (!prefix) return name;
  return `${prefix}::${name}`;
}

function flattenNamespaces(program) {
  if (!program || !program.namespaces || program.namespaces.length === 0) return program;

  const structs = [...(program.structs || [])];
  const classes = [...(program.classes || [])];
  const funcs = [...(program.funcs || [])];

  function addDecl(decl, prefix) {
    if (!decl || typeof decl !== "object") return;

    // Nested namespace
    if (decl instanceof AST.NamespaceDecl) {
      const nextPrefix = qualifyName(prefix, decl.name);
      for (const d of decl.decls || []) addDecl(d, nextPrefix);
      return;
    }

    const rawName =
      decl instanceof AST.TemplateClassDecl
        ? decl.classDecl && decl.classDecl.name
        : decl instanceof AST.TemplateStructDecl
          ? decl.structDecl && decl.structDecl.name
          : decl.name;

    const qName = rawName ? qualifyName(prefix, rawName) : null;
    const inStd = prefix === "std" || prefix.startsWith("std::");

    // Struct/Class/TemplateStruct/TemplateClass/Function/TemplateFunction declarations
    if (decl instanceof AST.StructDecl) {
      if (qName) {
        const q = clone(decl);
        q.name = qName;
        structs.push(q);
      }
      if (inStd && decl.name) {
        structs.push(clone(decl));
      }
      return;
    }
    if (decl instanceof AST.TemplateStructDecl) {
      if (qName) {
        const q = clone(decl);
        q.structDecl.name = qName;
        structs.push(q);
      }
      if (inStd && decl.structDecl && decl.structDecl.name) {
        structs.push(clone(decl));
      }
      return;
    }
    if (decl instanceof AST.ClassDecl) {
      if (qName) {
        const q = clone(decl);
        q.name = qName;
        classes.push(q);
      }
      if (inStd && decl.name) {
        classes.push(clone(decl));
      }
      return;
    }
    if (decl instanceof AST.TemplateClassDecl) {
      if (qName) {
        const q = clone(decl);
        q.classDecl.name = qName;
        classes.push(q);
      }
      if (inStd && decl.classDecl && decl.classDecl.name) {
        classes.push(clone(decl));
      }
      return;
    }
    if (decl instanceof AST.FunctionDecl || decl instanceof AST.TemplateFunctionDecl) {
      if (qName) {
        const q = clone(decl);
        q.name = qName;
        funcs.push(q);
      }
      if (inStd && decl.name) {
        funcs.push(clone(decl));
      }
      return;
    }

    // Unknown decl kinds are ignored by this pass.
  }

  for (const ns of program.namespaces) addDecl(ns, "");

  return new AST.Program(structs, classes, funcs, [], program.loc || null);
}

module.exports = { flattenNamespaces };
