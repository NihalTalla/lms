const BUILD_ID = '2026-01-22-fixpack-4';
console.log("USING PARSER:", __filename, "BUILD", BUILD_ID);
const T = require("./tokens");
const AST = require("./ast");
const { CompileError } = require("./errors");

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.current = tokens[0];

    this.knownStructs = new Set();
    this.knownClasses = new Set();

    // v1.0 templates: stack of in-scope template type parameters (e.g., ["T"]).
    this.templateTypeParamStack = [];
  }

  inTemplateTypeParams(name) {
    for (let i = this.templateTypeParamStack.length - 1; i >= 0; i--) {
      if (this.templateTypeParamStack[i].has(name)) return true;
    }
    return false;
  }

  loc(tok) {
    return tok ? { line: tok.line, col: tok.col } : null;
  }

  error(message, loc = null) {
    throw new CompileError(message, loc || this.loc(this.current));
  }

  peek(k = 1) {
    return this.tokens[this.pos + k] || this.tokens[this.tokens.length - 1];
  }

  eat(type) {
    if (this.current.type !== type) {
      this.error(`Expected ${type}, got ${this.current.type}`, this.loc(this.current));
    }
    const tok = this.current;
    this.pos += 1;
    this.current = this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
    return tok;
  }
  parseImportDecl() {
    this.eat(T.IMPORT);

    // import a.b.c;
    if (this.current.type !== T.IDENT) {
      this.error("Expected module name after import", this.loc(this.current));
    }

    this.eat(T.IDENT);
    while (this.current.type === T.DOT) {
      this.eat(T.DOT);
      if (this.current.type !== T.IDENT) {
        this.error("Expected identifier after '.' in import", this.loc(this.current));
      }
      this.eat(T.IDENT);
    }

    this.eat(T.SEMICOLON);
    return null;
  }

  // Skip a single header-like declaration, conservatively.
  // Used inside namespace blocks where we may see typedef/extern/template struct, etc.
  skipDeclLike() {
    let depth = 0;
    while (this.current.type !== T.EOF) {
      if (this.current.type === T.LBRACE) { depth++; this.eat(T.LBRACE); continue; }
      if (this.current.type === T.RBRACE) {
        if (depth == 0) return;
        depth--; this.eat(T.RBRACE); continue; }
      if (this.current.type === T.SEMICOLON && depth === 0) { this.eat(T.SEMICOLON); return; }
      // consume token
      this.pos += 1;
      this.current = this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
    }
  }

  // namespace <ident> { <decls...> }
  // Notes:
  // - Namespaces are flattened in a frontend pass (see namespaces.js).
  // - Within namespaces, we attempt to parse supported declarations.
  // - For unsupported header-style declarations, we skip conservatively.
  parseNamespaceDecl() {
    const nsTok = this.eat(T.NAMESPACE);
    const nameTok = this.eat(T.IDENT);
    const name = nameTok.value;

    if (this.current.type !== T.LBRACE) {
      this.error("Expected '{' after namespace name", this.loc(this.current));
    }
    this.eat(T.LBRACE);

    const decls = [];
    while (this.current.type !== T.RBRACE && this.current.type !== T.EOF) {
      if (this.current.type === T.IMPORT) { this.parseImportDecl(); continue; }
      if (this.current.type === T.NAMESPACE) { decls.push(this.parseNamespaceDecl()); continue; }
      if (this.current.type === T.TEMPLATE) {
        const saved = this.pos;
        try {
          decls.push(this.parseTemplateFunctionDecl());
        } catch (_) {
          // v1.1: support *template class/struct declarations* from stdlib headers.
          // We ignore the template parameters and parse the class/struct body as-is.
          // (Monomorphization for class templates is intentionally out of scope.)
          this.pos = saved;
          this.current = this.tokens[this.pos];
          const td = this.parseTemplateTypeDeclOrNull();
          if (td) {
            decls.push(td);
            if (td instanceof AST.StructDecl) this.knownStructs.add(td.name);
            if (td instanceof AST.ClassDecl) this.knownClasses.add(td.name);
          } else {
            this.skipDeclLike();
          }
        }
        continue;
      }
      if (this.current.type === T.STRUCT) {
        try {
          const sd = this.parseStructDecl();
          decls.push(sd);
          this.knownStructs.add(sd.name);
        } catch (_) {
          this.skipDeclLike();
        }
        continue;
      }
      if (this.current.type === T.CLASS) {
        try {
          const cd = this.parseClassDecl();
          decls.push(cd);
          this.knownClasses.add(cd.name);
        } catch (_) {
          this.skipDeclLike();
        }
        continue;
      }

      // Fallback: try a function decl; if it fails, skip.
      const saved = this.pos;
      try {
        decls.push(this.parseFunctionDecl());
      } catch (_) {
        this.pos = saved;
        this.current = this.tokens[this.pos];
        this.skipDeclLike();
      }
    }

    this.eat(T.RBRACE);
    if (this.current.type === T.SEMICOLON) this.eat(T.SEMICOLON);
    return new AST.NamespaceDecl(name, decls, this.loc(nsTok));
  }

  parse() {
    const structs = [];
    const classes = [];
    const funcs = [];
    const namespaces = [];

    while (this.current.type !== T.EOF) {
      // imports can appear anywhere (loader usually strips them, but keep parsing)
      if (this.current.type === T.IMPORT) {
        this.parseImportDecl();
        continue;
      }

      if (this.current.type === T.NAMESPACE) {
        namespaces.push(this.parseNamespaceDecl());
        continue;
      }

      // v1.0 template function decl: template <typename T, ...> <funcDecl>
      if (this.current.type === T.TEMPLATE) {
        const saved = this.pos;
        try {
          funcs.push(this.parseTemplateFunctionDecl());
        } catch (_) {
          // Top-level template class/struct (rare, but allow it).
          this.pos = saved;
          this.current = this.tokens[this.pos];
          const td = this.parseTemplateTypeDeclOrNull();
          if (td) {
            if (td instanceof AST.StructDecl) {
              structs.push(td);
              this.knownStructs.add(td.name);
            } else if (td instanceof AST.ClassDecl) {
              classes.push(td);
              this.knownClasses.add(td.name);
            }
          } else {
            throw _;
          }
        }
        continue;
      }
      if (this.current.type === T.STRUCT) {
        const sd = this.parseStructDecl();
        structs.push(sd);
        this.knownStructs.add(sd.name);
        continue;
      }
      if (this.current.type === T.CLASS) {
        const cd = this.parseClassDecl();
        classes.push(cd);
        this.knownClasses.add(cd.name);
        continue;
      }
      funcs.push(this.parseFunctionDecl());
    }

    return new AST.Program(structs, classes, funcs, namespaces, null);
  }

  // template <typename T, typename U, ...> <functionDecl>
  // v1.0 scope: function templates only.
  parseTemplateFunctionDecl() {
    const tTok = this.eat(T.TEMPLATE);

    // parse < typename T (, typename U)* >
    if (this.current.type !== T.LT) {
      this.error("Expected '<' after 'template'", this.loc(this.current));
    }
    this.eat(T.LT);

    const typeParams = [];
    // Accept:
    //   template <typename T, typename U>
    // and also ignore non-type params used by some std headers:
    //   template <typename T, T v>
    while (true) {
      if (this.current.type === T.TYPENAME) {
        this.eat(T.TYPENAME);
        const id = this.eat(T.IDENT);
        typeParams.push(id.value);
      } else {
        // Non-type param: <Type> <name>
        // We parse the type name but do not add it to the type-param set.
        this.parseTypeName(false);
        this.eat(T.IDENT);
      }

      if (this.current.type === T.COMMA) {
        this.eat(T.COMMA);
        continue;
      }
      break;
    }

    if (this.current.type !== T.GT) {
      this.error("Expected '>' to close template parameter list", this.loc(this.current));
    }
    this.eat(T.GT);

    // parse the function with template params in-scope
    const scopeSet = new Set(typeParams);
    this.templateTypeParamStack.push(scopeSet);
    const fn = this.parseFunctionDecl();
    this.templateTypeParamStack.pop();

    return new AST.TemplateFunctionDecl(typeParams, fn, this.loc(tTok));
  }

  // v1.1+: Parse a template class/struct declaration (stdlib headers use this heavily).
  // Unlike v1.1, we now PRESERVE the template type parameters so we can monomorphize
  // common stdlib containers (Option A).
  // Returns TemplateStructDecl/TemplateClassDecl, or null if not followed by struct/class.
  parseTemplateTypeDeclOrNull() {
    const tTok = this.current;
    // template <...> (class|struct) ...
    this.eat(T.TEMPLATE);

    if (this.current.type !== T.LT) return null;
    this.eat(T.LT);

    const typeParams = [];
    // Parse a permissive parameter list. We only record TYPE parameters of the form:
    //   typename T
    //   class T
    // Other parameters (non-type) are skipped (e.g., T v).
    while (this.current.type !== T.EOF && this.current.type !== T.GT) {
      // allow leading commas
      if (this.current.type === T.COMMA) { this.eat(T.COMMA); continue; }

      // template <> specialization: immediately '>'
      if (this.current.type === T.GT) break;

      if (this.current.type === T.TYPENAME || (this.current.type === T.IDENT && this.current.value === "class")) {
        // typename T  | class T
        this.eat(this.current.type);
        if (this.current.type !== T.IDENT) {
          this.error("Expected IDENT in template parameter list", this.loc(this.current));
        }
        typeParams.push(this.eat(T.IDENT).value);
      } else {
        // Skip token(s) until comma or '>' (handle nested <...> defensively)
        let depth = 0;
        while (this.current.type !== T.EOF) {
          if (this.current.type === T.LT) { depth++; this.eat(T.LT); continue; }
          if (this.current.type === T.GT && depth > 0) { depth--; this.eat(T.GT); continue; }
          if (depth === 0 && (this.current.type === T.COMMA || this.current.type === T.GT)) break;
          // consume one token
          this.pos++;
          this.current = this.tokens[this.pos] || this.tokens[this.tokens.length - 1];
        }
      }

      if (this.current.type === T.COMMA) this.eat(T.COMMA);
    }

    if (this.current.type !== T.GT) {
      this.error("Expected '>' to close template parameter list", this.loc(this.current));
    }
    this.eat(T.GT);

    const scopeSet = new Set(typeParams);
    this.templateTypeParamStack.push(scopeSet);

    let decl = null;
    if (this.current.type === T.STRUCT) {
      const sd = this.parseStructDecl();
      decl = new AST.TemplateStructDecl(typeParams, sd, this.loc(tTok));
    } else if (this.current.type === T.CLASS) {
      const cd = this.parseClassDecl();
      decl = new AST.TemplateClassDecl(typeParams, cd, this.loc(tTok));
    }

    this.templateTypeParamStack.pop();
    return decl;
  }

  // ---------------- Type Names ----------------
  // base:
  //   list | int | float | bool | string | void (only if allowVoid) | <StructName> | <ClassName>
  // plus pointer stars: T* , T** , ...
  // plus reference suffix: T& (optionally with stars: T*&)
  // optional const prefix: const T, const T*, const T&
  parseTypeName({ allowVoid = false } = {}) {
    const tTok = this.current;

    // optional const prefix (for params/locals; v0.8 surface)
    let isConst = false;
    if (this.current.type === T.CONST) {
      this.eat(T.CONST);
      isConst = true;
    }

    let base = null;

    if (this.current.type === T.LIST) {
      this.eat(T.LIST);
      base = "list";
    } else if (this.current.type === T.INT) {
      this.eat(T.INT);
      base = "int";
    } else if (this.current.type === T.FLOAT) {
      this.eat(T.FLOAT);
      base = "float";
    } else if (this.current.type === T.BOOL) {
      this.eat(T.BOOL);
      base = "bool";
    } else if (this.current.type === T.STRING_KW) {
      this.eat(T.STRING_KW);
      base = "string";
    } else if (allowVoid && this.current.type === T.VOID) {
      this.eat(T.VOID);
      base = "void";
    } else if (this.current.type === T.IDENT && this.current.value === "double") {
      // C++ 'double' / 'long double' are treated as float in this language.
      this.eat(T.IDENT);
      base = "float";
    } else if (this.current.type === T.IDENT &&
               (this.current.value === "long" ||
                this.current.value === "short" ||
                this.current.value === "unsigned" ||
                this.current.value === "signed")) {
      // Parse common C/C++ integer type spellings used in the stdlib stubs.
      // We normalize all of these to our single integral type: int.
      const first = this.eat(T.IDENT).value;
      // unsigned/signed may be followed by int/long/long long
      if (first === "unsigned" || first === "signed") {
        if (this.current.type === T.IDENT && this.current.value === "long") {
          this.eat(T.IDENT); // long
          if (this.current.type === T.IDENT && this.current.value === "long") this.eat(T.IDENT); // long long
        } else if ((this.current.type === T.INT) || (this.current.type === T.IDENT && this.current.value === "int")) {
          this.eat(this.current.type);
        } else if (this.current.type === T.IDENT && this.current.value === "short") {
          this.eat(T.IDENT);
          if ((this.current.type === T.INT) || (this.current.type === T.IDENT && this.current.value === "int")) this.eat(this.current.type);
        }
        // normalize unsigned/signed variants to int
        if (base === null) base = "int";
      } else if (first === "long") {
        // Special-case: long double -> float
        if (this.current.type === T.IDENT && this.current.value === "double") {
          this.eat(T.IDENT);
          base = "float";
        } else {
          if (this.current.type === T.IDENT && this.current.value === "long") this.eat(T.IDENT); // long long
          if ((this.current.type === T.INT) || (this.current.type === T.IDENT && this.current.value === "int")) this.eat(this.current.type);
          base = "int";
        }
      } else if (first === "short") {
        if ((this.current.type === T.INT) || (this.current.type === T.IDENT && this.current.value === "int")) this.eat(this.current.type);
        base = "int";
      } else {
        base = "int";
      }
    } else if (this.current.type === T.IDENT) {
      // v1.1: allow qualified type names (A::B) and template type names (vector<int>).
      // Also relax the requirement that the type must be previously declared; this
      // makes it possible to parse header-style declarations and opaque external types.
      const parts = [];
      // collect identifiers possibly separated by ::
      parts.push(this.eat(T.IDENT).value);
      while (this.current.type === T.SCOPE) {
        this.eat(T.SCOPE);
        parts.push(this.eat(T.IDENT).value);
      }
      base = parts.join("::");

      // Optional template arguments: T<...>
      if (this.current.type === T.LT) {
        this.eat(T.LT);
        const args = [];
        // Empty template arg list not allowed
        while (true) {
          const a = this.parseTypeName({ allowVoid: false });
          args.push(a.typeName);
          if (this.current.type === T.COMMA) { this.eat(T.COMMA); continue; }
          break;
        }
        if (this.current.type !== T.GT) {
          this.error("Expected '>' to close template type", this.loc(this.current));
        }
        this.eat(T.GT);
        base = `${base}<${args.join(", ")}>`;
      }
    } else {
      this.error("Expected type name", this.loc(tTok));
    }

    // pointer suffix: *
    let stars = 0;
    while (this.current.type === T.STAR) {
      this.eat(T.STAR);
      stars += 1;
    }

    // reference suffix: &
    let isRef = false;
    if (this.current.type === T.AMP) {
      if (base === "void") {
        this.error("Cannot form reference to 'void'", this.loc(this.current));
      }
      this.eat(T.AMP);
      isRef = true;
    }

    let typeName = stars > 0 ? base + "*".repeat(stars) : base;
    if (isRef) typeName = typeName + "&";
    if (isConst) typeName = "const " + typeName;

    return { typeName, loc: this.loc(tTok) };
  }

  // quick lookahead for var-decl starts, including pointers and optional const:
  // [const] <type> <ident> ...
  canStartVarDecl() {
    const t0 = this.tokens[this.pos];
    if (!t0) return false;

    let j = this.pos;

    // optional const prefix for locals
    if (this.tokens[j] && this.tokens[j].type === T.CONST) j++;

    const t = this.tokens[j];
    if (!t) return false;

    const isDefinitelyTypeStart =
      t.type === T.INT ||
      t.type === T.FLOAT ||
      t.type === T.BOOL ||
      t.type === T.LIST ||
      t.type === T.STRING_KW ||
      t.type === T.VOID;

    // v1.1: be more permissive: try to parse a type name in lookahead mode.
    if (isDefinitelyTypeStart || t.type === T.IDENT) {
      const savedPos = this.pos;
      const savedCur = this.current;
      try {
        this.pos = j;
        this.current = this.tokens[this.pos];
        this.parseTypeName({ allowVoid: false });
        // after a type, we expect an identifier for the variable name
        const ok = this.current && this.current.type === T.IDENT;
        this.pos = savedPos;
        this.current = savedCur;
        return ok;
      } catch (_) {
        this.pos = savedPos;
        this.current = savedCur;
        return false;
      }
    }

    return false;
  }

  // ---------------- Decls ----------------

  // struct Point { int x; int y; };
  parseStructDecl() {
    const sTok = this.eat(T.STRUCT);
    const baseNameTok = this.eat(T.IDENT);

    // Allow template-id names in struct declarations used by stdlib stubs,
    // e.g. `struct is_integral<int> : true_type { ... };`
    let structName = baseNameTok.value;
    if (this.current.type === T.LT) {
      // consume `< ... >` as part of the name; we don't need it for runtime,
      // but parsing must succeed.
      let depth = 0;
      let nameSuffix = "";
      while (this.current.type !== T.EOF) {
        if (this.current.type === T.LT) depth++;
        if (this.current.type === T.GT) depth--;
        nameSuffix += this.current.value ?? this.current.type;
        this.eat(this.current.type);
        if (depth === 0) break;
      }
      structName += "<...>";
    }

    // Optional inheritance: : Base
    let baseName = null;
    if (this.current.type === T.COLON) {
      this.eat(T.COLON);
      const bTok = this.eat(T.IDENT);
      baseName = bTok.value;
    }

    this.eat(T.LBRACE);

    const fields = [];

    while (this.current.type !== T.RBRACE) {
      // access labels inside struct body: public: / private: / protected:
      if (
        (this.current.type === T.PUBLIC ||
          this.current.type === T.PRIVATE ||
          this.current.type === T.PROTECTED) &&
        this.peek(1).type === T.COLON
      ) {
        this.eat(this.current.type);
        this.eat(T.COLON);
        continue;
      }

      // Skip storage/class specifiers and type-alias statements used in stdlib
      // stubs (compile-time only): `static ...;` and `typedef ...;`
      if (this.current.type === T.IDENT && this.current.value === "static") {
        this.eat(T.IDENT);
      }
      if (this.current.type === T.IDENT && this.current.value === "typedef") {
        this.eat(T.IDENT);
        this.parseTypeName({ allowVoid: false });
        // typedef name
        this.eat(T.IDENT);
        this.eat(T.SEMICOLON);
        continue;
      }

      // Constructor declarations in stdlib structs (e.g. `pair();`) have no return type.
      if (this.current.type === T.IDENT && this.current.value === baseNameTok.value && this.peek(1).type === T.LPAREN) {
        this.eat(T.IDENT);
        this.parseParamListAndBody({ allowQualifiers: true });
        continue;
      }

      // destructor declarations in stdlib structs: ~T();
      if (this.current.type === T.TILDE) {
        this.eat(T.TILDE);
        this.eat(T.IDENT);
        // empty param list
        this.eat(T.LPAREN);
        this.eat(T.RPAREN);
        if (this.current.type === T.LBRACE) this.parseBlock();
        else this.eat(T.SEMICOLON);
        continue;
      }

      const ty = this.parseTypeName({ allowVoid: true });

      // method / field name
      let nameTok = this.eat(T.IDENT);
      if (nameTok.value === "operator") {
        if (this.current.type === T.SHL) {
          this.eat(T.SHL);
          nameTok = { ...nameTok, value: "operator<<" };
        } else if (this.current.type === T.SHR) {
          this.eat(T.SHR);
          nameTok = { ...nameTok, value: "operator>>" };
        } else if (this.current.type === T.ASSIGN) {
          this.eat(T.ASSIGN);
          nameTok = { ...nameTok, value: "operator=" };
        } else if (this.current.type === T.LBRACKET) {
          this.eat(T.LBRACKET);
          this.eat(T.RBRACKET);
          nameTok = { ...nameTok, value: "operator[]" };
        }
      }

      // If next is LPAREN => method decl; we ignore methods in StructDecl
      if (this.current.type === T.LPAREN) {
        this.parseParamListAndBody({ allowQualifiers: true });
        continue;
      }

      // field decl
      if (ty.typeName === "void" || ty.typeName === "const void") {
        this.error("Struct fields cannot be 'void'", ty.loc);
      }

      // array declarator: name[N]
      if (this.current.type === T.LBRACKET) {
        this.eat(T.LBRACKET);
        if (this.current.type !== T.RBRACKET) this.parseExpr();
        this.eat(T.RBRACKET);
      }

      // optional initializer
      if (this.current.type === T.ASSIGN) {
        this.eat(T.ASSIGN);
        this.parseExpr();
      }

      this.eat(T.SEMICOLON);
      fields.push({ typeName: ty.typeName, name: nameTok.value, loc: this.loc(nameTok) });
    }

    this.eat(T.RBRACE);
    this.eat(T.SEMICOLON);

    // We keep the StructDecl node shape, but also store baseName (optional)
    // as an extra property to avoid breaking older passes.
    const node = new AST.StructDecl(structName, fields, this.loc(sTok));
    node.baseName = baseName;
    return node;
  }

  // class B : public A { ... };
  parseClassDecl() {
    const cTok = this.eat(T.CLASS);
    const nameTok = this.eat(T.IDENT);

    // Allow template-id names in class declarations used by stdlib stubs,
    // e.g. `class numeric_limits<int> { ... };`
    let className = nameTok.value;
    if (this.current.type === T.LT) {
      let depth = 0;
      while (this.current.type !== T.EOF) {
        if (this.current.type === T.LT) depth++;
        if (this.current.type === T.GT) depth--;
        this.eat(this.current.type);
        if (depth === 0) break;
      }
      className += "<...>";
    }

    // optional inheritance: : public Base
    let baseName = null;
    if (this.current.type === T.COLON) {
      this.eat(T.COLON);

      // v0.8: require 'public' for now
      if (this.current.type !== T.PUBLIC) {
        this.error("Expected 'public' in inheritance clause", this.loc(this.current));
      }
      this.eat(T.PUBLIC);

      const baseTok = this.eat(T.IDENT);
      baseName = baseTok.value;
    }

    this.eat(T.LBRACE);

    const fields = [];
    const methods = [];
    const destructors = [];

    while (this.current.type !== T.RBRACE) {
      // access labels inside class body: public: / private: / protected:
      if (
        (this.current.type === T.PUBLIC ||
          this.current.type === T.PRIVATE ||
          this.current.type === T.PROTECTED) &&
        this.peek(1).type === T.COLON
      ) {
        this.eat(this.current.type);
        this.eat(T.COLON);
        continue;
      }

      // Skip storage/type-alias statements used in stdlib stubs (compile-time only)
      // inside class bodies: `static ...;` and `typedef ...;`
      if (this.current.type === T.IDENT && this.current.value === "static") {
        this.eat(T.IDENT);
      }
      if (this.current.type === T.IDENT && this.current.value === "typedef") {
        this.eat(T.IDENT);
        this.parseTypeName({ allowVoid: false });
        this.eat(T.IDENT);
        this.eat(T.SEMICOLON);
        continue;
      }

      // destructor: ~ClassName() { ... }
      if (this.current.type === T.TILDE) {
        const tTok = this.eat(T.TILDE);
        const dNameTok = this.eat(T.IDENT);
        if (dNameTok.value !== nameTok.value) {
          this.error(
            `Destructor name must match class name '${nameTok.value}'`,
            this.loc(dNameTok)
          );
        }

        // must be empty parameter list
        this.eat(T.LPAREN);
        if (this.current.type !== T.RPAREN) {
          this.error("Destructor cannot take parameters", this.loc(this.current));
        }
        this.eat(T.RPAREN);

        let body = null;
        if (this.current.type === T.LBRACE) {
          body = this.parseBlock();
        } else if (this.current.type === T.SEMICOLON) {
          this.eat(T.SEMICOLON);
          body = null;
        } else {
          this.error("Expected '{' or ';' after destructor signature", this.loc(this.current));
        }
        destructors.push(new AST.DestructorDecl(nameTok.value, body, this.loc(tTok)));
        continue;
      }

      // constructor declaration/definition inside class: ClassName(...) { ... } or ';'
      if (this.current.type === T.IDENT && this.current.value === nameTok.value && this.peek(1).type === T.LPAREN) {
        // parse and discard (stdlib uses this heavily; runtime constructors are not modeled)
        this.eat(T.IDENT);
        const { body } = this.parseParamListAndBody({ allowQualifiers: true });
        // if a body exists, we still discard it (no ctor semantics in the VM right now)
        continue;
      }

      // optional 'readonly' for fields (only meaningful for fields)
      let fieldReadonly = false;
      if (this.current.type === T.READONLY) {
        fieldReadonly = true;
        this.eat(T.READONLY);
      }

      // optional 'virtual' for methods
      let isVirtual = false;
      if (this.current.type === T.VIRTUAL) {
        isVirtual = true;
        this.eat(T.VIRTUAL);
      }

      const ty = this.parseTypeName({ allowVoid: true });

      if (ty.typeName === "void" || ty.typeName === "const void") {
        // must be method (void field is illegal)
        const mNameTok = this.eat(T.IDENT);
        const { params, qualifiers, body } = this.parseParamListAndBody({ allowQualifiers: true });

        methods.push(
          new AST.MethodDecl(
            mNameTok.value,
            "void",
            params,
            body,
            {
              isVirtual,
              isOverride: qualifiers.isOverride,
              isConst: qualifiers.isConst,
            },
            this.loc(mNameTok)
          )
        );
        continue;
      }

      // method / field name
      let nameOrFieldTok = this.eat(T.IDENT);

      // Support common operator overload declarations in the stdlib stubs,
      // e.g. `ostream& operator<<(int v);` / `istream& operator>>(int& v);`
      if (nameOrFieldTok.value === "operator") {
        if (this.current.type === T.SHL) {
          this.eat(T.SHL);
          nameOrFieldTok = { ...nameOrFieldTok, value: "operator<<" };
        } else if (this.current.type === T.SHR) {
          this.eat(T.SHR);
          nameOrFieldTok = { ...nameOrFieldTok, value: "operator>>" };
        } else if (this.current.type === T.ASSIGN) {
          // operator=
          this.eat(T.ASSIGN);
          nameOrFieldTok = { ...nameOrFieldTok, value: "operator=" };
        } else if (this.current.type === T.LBRACKET) {
          // operator[]
          this.eat(T.LBRACKET);
          this.eat(T.RBRACKET);
          nameOrFieldTok = { ...nameOrFieldTok, value: "operator[]" };
        }
      }

      // If next is LPAREN => method, else field
      if (this.current.type === T.LPAREN) {
        const { params, qualifiers, body } = this.parseParamListAndBody({ allowQualifiers: true });

        methods.push(
          new AST.MethodDecl(
            nameOrFieldTok.value,
            ty.typeName,
            params,
            body,
            {
              isVirtual,
              isOverride: qualifiers.isOverride,
              isConst: qualifiers.isConst,
            },
            this.loc(nameOrFieldTok)
          )
        );
      } else {
        // field decl
        // Support fixed-size array fields in stdlib stubs, e.g. `T _data[N];`
        if (this.current.type === T.LBRACKET) {
          this.eat(T.LBRACKET);
          // consume the size expression (usually an identifier or integer)
          if (this.current.type !== T.RBRACKET) {
            this.parseExpr();
          }
          this.eat(T.RBRACKET);
        }
        // allow in-class initializers in stdlib stubs
        if (this.current.type === T.ASSIGN) {
          this.eat(T.ASSIGN);
          this.parseExpr();
        }
        this.eat(T.SEMICOLON);
        fields.push({
          typeName: ty.typeName,
          name: nameOrFieldTok.value,
          isReadonly: fieldReadonly,
          loc: this.loc(nameOrFieldTok),
        });
      }
    }

    this.eat(T.RBRACE);
    this.eat(T.SEMICOLON);

    return new AST.ClassDecl(className, baseName, fields, methods, destructors, this.loc(cTok));
  }

  parseParamListAndBody({ allowQualifiers = false } = {}) {
    this.eat(T.LPAREN);
    const params = [];
    if (this.current.type !== T.RPAREN) {
      while (true) {
        const pTy = this.parseTypeName({ allowVoid: false });
        if (pTy.typeName === "void" || pTy.typeName === "const void") {
          this.error("Parameters cannot be 'void'", pTy.loc);
        }

        // Minimal function-pointer parameter declarator support.
        // Example: int (*cmp)(const void*, const void*)
        // We don't fully type-check function pointers yet; we treat them as opaque void*.
        if (this.current.type === T.LPAREN) {
          const lparen = this.eat(T.LPAREN);
          this.eat(T.STAR);
          const nameTok = this.eat(T.IDENT);
          this.eat(T.RPAREN);
          // parse and skip the function parameter list
          this.eat(T.LPAREN);
          const fnParamTypes = [];
          if (this.current.type !== T.RPAREN) {
            while (true) {
              // accept types like: const void*, int, T&, etc.
              const fpt = this.parseTypeName({ allowVoid: false });
              fnParamTypes.push(fpt.typeName);
              // optional parameter name (common in prototypes)
              if (this.current.type === T.IDENT) this.eat(T.IDENT);
              if (this.current.type === T.COMMA) {
                this.eat(T.COMMA);
                continue;
              }
              break;
            }
          }
          this.eat(T.RPAREN);
          params.push({ typeName: `fnptr<${pTy.typeName}>(${fnParamTypes.join(",")})`, name: nameTok.value, loc: this.loc(nameTok) });
        } else {
          const pTok = this.eat(T.IDENT);
          params.push({ typeName: pTy.typeName, name: pTok.value, loc: this.loc(pTok) });
        }

        if (this.current.type === T.COMMA) {
          this.eat(T.COMMA);
          continue;
        }
        break;
      }
    }
    this.eat(T.RPAREN);

    // method qualifiers after params: const / override (v0.8)
    const qualifiers = { isConst: false, isOverride: false };

    if (allowQualifiers) {
      // allow in either order, though typical is: const override
      while (this.current.type === T.CONST || this.current.type === T.OVERRIDE) {
        if (this.current.type === T.CONST) {
          this.eat(T.CONST);
          qualifiers.isConst = true;
          continue;
        }
        if (this.current.type === T.OVERRIDE) {
          this.eat(T.OVERRIDE);
          qualifiers.isOverride = true;
          continue;
        }
      }
    }

    // method/function body: either a block { ... } or a declaration ';'
    let body = null;
    if (this.current.type === T.LBRACE) {
      body = this.parseBlock();
    } else if (this.current.type === T.SEMICOLON) {
      this.eat(T.SEMICOLON);
      body = null;
    } else {
      this.error("Expected '{' or ';' after parameter list", this.loc(this.current));
    }
    return { params, qualifiers, body };
  }

  // int main() { ... }   OR   void foo(int a, float b) { ... }
  parseFunctionDecl() {
    const rt = this.parseTypeName({ allowVoid: true });
    const nameTok = this.eat(T.IDENT);

    // for free functions we do NOT accept override/virtual qualifiers
    const { params, body } = this.parseParamListAndBody({ allowQualifiers: false });
    return new AST.FunctionDecl(nameTok.value, rt.typeName, params, body, this.loc(nameTok));
  }

  // ---------------- Blocks / Statements ----------------

  parseBlock() {
    this.eat(T.LBRACE);
    const stmts = [];
    while (this.current.type !== T.RBRACE) {
      stmts.push(this.parseStatement());
    }
    this.eat(T.RBRACE);
    return stmts;
  }

  parseBlockOrSingleStmt() {
    if (this.current.type === T.LBRACE) return this.parseBlock();
    return [this.parseStatement()];
  }

  parseStatement() {
    if (this.current.type === T.RETURN) {
      const rTok = this.eat(T.RETURN);
      let expr = null;
      if (this.current.type !== T.SEMICOLON) expr = this.parseExpr();
      this.eat(T.SEMICOLON);
      return new AST.ReturnStmt(expr, this.loc(rTok));
    }

    if (this.current.type === T.IF) {
      const ifTok = this.eat(T.IF);
      this.eat(T.LPAREN);
      const cond = this.parseExpr();
      this.eat(T.RPAREN);
      const thenBody = this.parseBlockOrSingleStmt();

      let elseBody = [];
      if (this.current.type === T.ELSE) {
        this.eat(T.ELSE);
        if (this.current.type === T.IF) elseBody = [this.parseStatement()];
        else elseBody = this.parseBlockOrSingleStmt();
      }
      return new AST.IfStmt(cond, thenBody, elseBody, this.loc(ifTok));
    }

    if (this.current.type === T.WHILE) {
      const wTok = this.eat(T.WHILE);
      this.eat(T.LPAREN);
      const cond = this.parseExpr();
      this.eat(T.RPAREN);
      const body = this.parseBlockOrSingleStmt();
      return new AST.WhileStmt(cond, body, this.loc(wTok));
    }

    if (this.current.type === T.FOR) {
      const fTok = this.eat(T.FOR);
      this.eat(T.LPAREN);

      // init
      let init = null;
      if (this.current.type !== T.SEMICOLON) {
        if (this.canStartVarDecl()) {
          // parse var decl without consuming trailing ';' twice
          init = this.parseVarDecl();
        } else {
          const expr = this.parseExpr();
          this.eat(T.SEMICOLON);
          init = new AST.ExprStmt(expr, this.loc(fTok));
        }
      } else {
        this.eat(T.SEMICOLON);
      }

      // condition
      let cond = null;
      if (this.current.type !== T.SEMICOLON) {
        cond = this.parseExpr();
      }
      this.eat(T.SEMICOLON);

      // post
      let post = null;
      if (this.current.type !== T.RPAREN) {
        post = this.parseExpr();
      }
      this.eat(T.RPAREN);

      const body = this.parseBlockOrSingleStmt();
      return new AST.ForStmt(init, cond, post, body, this.loc(fTok));
    }

    // local class decl inside blocks: class X { ... };
    if (this.current.type === T.CLASS) {
      const cd = this.parseClassDecl();
      this.knownClasses.add(cd.name);
      return cd;
    }

    // v0.7: delete expr;
    if (this.current.type === T.DELETE) {
      const dTok = this.eat(T.DELETE);
      const expr = this.parseExpr();
      this.eat(T.SEMICOLON);
      return new AST.DeleteStmt(expr, this.loc(dTok));
    }

    // var decls (including pointers, optional const)
    // v0.9: throw expr;  /  throw; (rethrow)
    if (this.current.type === T.THROW) {
      const tTok = this.eat(T.THROW);
      let expr = null;
      // "throw;" is treated as a rethrow (validated later in IRGen)
      if (this.current.type !== T.SEMICOLON) expr = this.parseExpr();
      this.eat(T.SEMICOLON);
      return new AST.ThrowStmt(expr, this.loc(tTok));
    }

    // v0.9: try { ... } catch (Type name?) { ... }
    // v0.9 polish: catch (...) { ... }  (catch-all)
    if (this.current.type === T.TRY) {
      const trTok = this.eat(T.TRY);
      const tryBody = this.parseBlockOrSingleStmt();

      this.eat(T.CATCH);
      this.eat(T.LPAREN);
      let typeName = null;
      let name = null;

      if (this.current.type === T.ELLIPSIS) {
        // catch-all
        this.eat(T.ELLIPSIS);
      } else {
        const ty = this.parseTypeName({ allowVoid: false });
        typeName = ty.typeName;
        if (this.current.type === T.IDENT) {
          const nameTok = this.eat(T.IDENT);
          name = nameTok.value;
        }
      }
      this.eat(T.RPAREN);

      const catchBody = this.parseBlockOrSingleStmt();

      const cc = new AST.CatchClause(typeName, name, catchBody, this.loc(trTok));
      return new AST.TryCatchStmt(tryBody, cc, this.loc(trTok));
    }

    if (this.canStartVarDecl()) {
      return this.parseVarDecl();
    }

    // list index assignment fast-path: a[i] = expr;
    if (this.current.type === T.IDENT && this.peek().type === T.LBRACKET) {
      const start = this.current;
      const expr = this.parseExpr();
      if (expr instanceof AST.IndexExpr && this.current.type === T.ASSIGN) {
        const aTok = this.eat(T.ASSIGN);
        const value = this.parseExpr();
        this.eat(T.SEMICOLON);
        return new AST.AssignIndexStmt(expr.list, expr.index, value, this.loc(aTok));
      }
      this.eat(T.SEMICOLON);
      if (expr instanceof AST.PrintStmt) return expr;
      return new AST.ExprStmt(expr, this.loc(start));
    }

    // assignment: x = expr;
    if (this.current.type === T.IDENT && this.peek().type === T.ASSIGN) {
      const nameTok = this.eat(T.IDENT);
      const aTok = this.eat(T.ASSIGN);
      const expr = this.parseExpr();
      this.eat(T.SEMICOLON);
      return new AST.AssignStmt(nameTok.value, expr, this.loc(aTok));
    }

    // expression statement OR generalized assignment:
    const startTok = this.current;
    const lhs = this.parseExpr();

    // generalized assignment: <lhs> = <expr> ;
    if (this.current.type === T.ASSIGN) {
      const aTok = this.eat(T.ASSIGN);
      const rhs = this.parseExpr();
      this.eat(T.SEMICOLON);

      if (lhs instanceof AST.VarExpr) {
        return new AST.AssignStmt(lhs.name, rhs, this.loc(aTok));
      }

      if (lhs instanceof AST.FieldAccessExpr) {
        return new AST.AssignFieldStmt(lhs.base, lhs.field, rhs, this.loc(aTok));
      }

      // v0.7: ptr->field = rhs;
      if (lhs instanceof AST.PtrFieldAccessExpr) {
        return new AST.AssignPtrFieldStmt(lhs.basePtr, lhs.field, rhs, this.loc(aTok));
      }

      // v1.1: *ptr = rhs;
      if (lhs instanceof AST.UnaryExpr && lhs.op === "*") {
        return new AST.AssignPtrStmt(lhs.expr, rhs, this.loc(aTok));
      }

      if (lhs instanceof AST.IndexExpr) {
        return new AST.AssignIndexStmt(lhs.list, lhs.index, rhs, this.loc(aTok));
      }

      this.error("Invalid assignment target", this.loc(aTok));
    }

    // normal expression statement
    this.eat(T.SEMICOLON);
    if (lhs instanceof AST.PrintStmt) return lhs;
    return new AST.ExprStmt(lhs, this.loc(startTok));
  }

  parseVarDecl() {
    const ty = this.parseTypeName({ allowVoid: false });
    if (ty.typeName === "void" || ty.typeName === "const void") {
      this.error("Variables cannot be 'void'", ty.loc);
    }
    const typeName = ty.typeName;

    const nameTok = this.eat(T.IDENT);

    let init = null;
    if (this.current.type === T.ASSIGN) {
      this.eat(T.ASSIGN);
      init = this.parseExpr();
    }

    this.eat(T.SEMICOLON);
    return new AST.VarDecl(typeName, nameTok.value, init, this.loc(nameTok));
  }

  // ---------------- Expressions (precedence) ----------------
  parseExpr() { return this.parseConditional(); }
    // conditional (ternary) expression
  // condition ? thenExpr : elseExpr
  parseConditional() {
    let cond = this.parseOr();

    if (this.current.type === T.QUESTION) {
      const qTok = this.eat(T.QUESTION);

      const thenExpr = this.parseExpr();

      if (this.current.type !== T.COLON) {
        this.error("Expected ':' in conditional expression", this.loc(this.current));
      }
      this.eat(T.COLON);

      const elseExpr = this.parseConditional();

      return new AST.ConditionalExpr(cond, thenExpr, elseExpr, this.loc(qTok));
    }

    return cond;
  }


  parseOr() {
    let node = this.parseAnd();
    while (this.current.type === T.OR_OR) {
      const opTok = this.eat(T.OR_OR);
      const rhs = this.parseAnd();
      node = new AST.BinaryExpr("||", node, rhs, this.loc(opTok));
    }
    return node;
  }

  parseAnd() {
    let node = this.parseEquality();
    while (this.current.type === T.AND_AND) {
      const opTok = this.eat(T.AND_AND);
      const rhs = this.parseEquality();
      node = new AST.BinaryExpr("&&", node, rhs, this.loc(opTok));
    }
    return node;
  }

  parseEquality() {
    let node = this.parseRelational();
    while (this.current.type === T.EQEQ || this.current.type === T.NEQ) {
      const opTok = this.current;
      if (this.current.type === T.EQEQ) this.eat(T.EQEQ);
      else this.eat(T.NEQ);
      const rhs = this.parseRelational();
      const op = opTok.type === T.EQEQ ? "==" : "!=";
      node = new AST.BinaryExpr(op, node, rhs, this.loc(opTok));
    }
    return node;
  }

  parseRelational() {
    let node = this.parseShift();
    while (
      this.current.type === T.LT ||
      this.current.type === T.GT ||
      this.current.type === T.LE ||
      this.current.type === T.GE
    ) {
      const opTok = this.current;
      if (this.current.type === T.LT) this.eat(T.LT);
      else if (this.current.type === T.GT) this.eat(T.GT);
      else if (this.current.type === T.LE) this.eat(T.LE);
      else this.eat(T.GE);

      const rhs = this.parseShift();
      const op =
        opTok.type === T.LT ? "<" :
        opTok.type === T.GT ? ">" :
        opTok.type === T.LE ? "<=" : ">=";

      node = new AST.BinaryExpr(op, node, rhs, this.loc(opTok));
    }
    return node;
  }

  // shift operators: << and >> (used heavily by iostream-style code)
  // precedence: additive > shift > relational
  parseShift() {
    let node = this.parseAdd();
    while (this.current.type === T.SHL || this.current.type === T.SHR) {
      const opTok = this.current;
      if (this.current.type === T.SHL) this.eat(T.SHL);
      else this.eat(T.SHR);
      const rhs = this.parseAdd();
      const op = opTok.type === T.SHL ? "<<" : ">>";
      node = new AST.BinaryExpr(op, node, rhs, this.loc(opTok));
    }
    return node;
  }

  parseAdd() {
    let node = this.parseMul();
    while (this.current.type === T.PLUS || this.current.type === T.MINUS) {
      const opTok = this.current;
      if (this.current.type === T.PLUS) this.eat(T.PLUS);
      else this.eat(T.MINUS);
      const rhs = this.parseMul();
      const op = opTok.type === T.PLUS ? "+" : "-";
      node = new AST.BinaryExpr(op, node, rhs, this.loc(opTok));
    }
    return node;
  }

  parseMul() {
    let node = this.parseUnary();
    while (this.current.type === T.STAR || this.current.type === T.SLASH || this.current.type === T.MOD) {
      const opTok = this.current;
      if (this.current.type === T.STAR) this.eat(T.STAR);
      else if (this.current.type === T.SLASH) this.eat(T.SLASH);
      else this.eat(T.MOD);

      const rhs = this.parseUnary();
      const op = opTok.type === T.STAR ? "*" : opTok.type === T.SLASH ? "/" : "%";
      node = new AST.BinaryExpr(op, node, rhs, this.loc(opTok));
    }
    return node;
  }

  parseUnary() {
    // v1.1: prefix increment
    if (this.current.type === T.PLUSPLUS) {
      const opTok = this.eat(T.PLUSPLUS);
      const expr = this.parseUnary();
      return new AST.IncExpr(expr, "pre", this.loc(opTok));
    }

    // v1.1: address-of / dereference
    if (this.current.type === T.AMP) {
      const opTok = this.eat(T.AMP);
      const expr = this.parseUnary();
      return new AST.UnaryExpr("&", expr, this.loc(opTok));
    }
    if (this.current.type === T.STAR) {
      const opTok = this.eat(T.STAR);
      const expr = this.parseUnary();
      return new AST.UnaryExpr("*", expr, this.loc(opTok));
    }

    // v1.1: C-style casts: (Type)expr
    if (this.current.type === T.LPAREN) {
      const savedPos = this.pos;
      const savedCurrent = this.current;
      try {
        const lTok = this.eat(T.LPAREN);
        const ty = this.parseTypeName({ allowVoid: false });
        this.eat(T.RPAREN);
        const rhs = this.parseUnary();
        return new AST.CastExpr(ty.typeName, rhs, this.loc(lTok));
      } catch (_) {
        // not a cast; backtrack
        this.pos = savedPos;
        this.current = savedCurrent;
      }
    }

    if (this.current.type === T.BANG) {
      const opTok = this.eat(T.BANG);
      const expr = this.parseUnary();
      return new AST.UnaryExpr("!", expr, this.loc(opTok));
    }
    if (this.current.type === T.MINUS) {
      const opTok = this.eat(T.MINUS);
      const expr = this.parseUnary();
      return new AST.UnaryExpr("-", expr, this.loc(opTok));
    }
    return this.parsePostfix();
  }

  parsePostfix() {
    let node = this.parsePrimary();

    while (true) {
      // v1.0 templates: foo<int> (only for free functions)
      if (this.current.type === T.LT && node instanceof AST.VarExpr) {
        const savedPos = this.pos;
        const savedCurrent = this.current;
        try {
          const ltTok = this.eat(T.LT);
          const typeArgs = [];
          while (true) {
          // template args are type names (no void)
          const ty = this.parseTypeName({ allowVoid: false });
          typeArgs.push(ty.typeName);
            if (this.current.type === T.COMMA) {
              this.eat(T.COMMA);
              continue;
            }
            break;
          }
          this.eat(T.GT);

          // Only accept if followed by a call (...). Otherwise, treat as comparison and backtrack.
          if (this.current.type !== T.LPAREN) throw new Error("not a template call");
          node = new AST.TemplateCalleeExpr(node, typeArgs, this.loc(ltTok));
          continue;
        } catch (_) {
          // backtrack (so '<' can be treated as a normal operator elsewhere)
          this.pos = savedPos;
          this.current = savedCurrent;
        }
      }
      // field access: a.b
      if (this.current.type === T.DOT) {
        const dTok = this.eat(T.DOT);
        const fTok = this.eat(T.IDENT);
        node = new AST.FieldAccessExpr(node, fTok.value, this.loc(dTok));
        continue;
      }

      // pointer field access: p->field
      if (this.current.type === T.ARROW) {
        const aTok = this.eat(T.ARROW);
        const fTok = this.eat(T.IDENT);
        node = new AST.PtrFieldAccessExpr(node, fTok.value, this.loc(aTok));
        continue;
      }

      // call: foo(...) or obj.method(...)
      if (this.current.type === T.LPAREN) {
        const cTok = this.eat(T.LPAREN);
        const args = [];
        if (this.current.type !== T.RPAREN) {
          while (true) {
            args.push(this.parseExpr());
            if (this.current.type === T.COMMA) {
              this.eat(T.COMMA);
              continue;
            }
            break;
          }
        }
        this.eat(T.RPAREN);
        // If callee was a TemplateCalleeExpr, build TemplateCallExpr so frontend can monomorphize.
        if (node instanceof AST.TemplateCalleeExpr) {
          node = new AST.TemplateCallExpr(node.callee, node.typeArgs, args, this.loc(cTok));
        } else {
          node = new AST.CallExpr(node, args, this.loc(cTok));
        }
        continue;
      }

      // index: a[i]
      if (this.current.type === T.LBRACKET) {
        const iTok = this.eat(T.LBRACKET);
        const index = this.parseExpr();
        this.eat(T.RBRACKET);
        node = new AST.IndexExpr(node, index, this.loc(iTok));
        continue;
      }

      // v1.1: postfix increment
      if (this.current.type === T.PLUSPLUS) {
        const opTok = this.eat(T.PLUSPLUS);
        node = new AST.IncExpr(node, "post", this.loc(opTok));
        continue;
      }

      break;
    }

    return node;
  }

  parsePrimary() {
    const tok = this.current;

    // list literal: [a, b, c]
    if (tok.type === T.LBRACKET) {
      this.eat(T.LBRACKET);
      const elems = [];
      if (this.current.type !== T.RBRACKET) {
        while (true) {
          elems.push(this.parseExpr());
          if (this.current.type === T.COMMA) {
            this.eat(T.COMMA);
            continue;
          }
          break;
        }
      }
      this.eat(T.RBRACKET);
      return new AST.ListLiteral(elems, this.loc(tok));
    }

    // print(...)
    if (tok.type === T.IDENT && tok.value === "print" && this.peek().type === T.LPAREN) {
      const nameTok = this.eat(T.IDENT);
      this.eat(T.LPAREN);
      const args = [];
      if (this.current.type !== T.RPAREN) {
        while (true) {
          args.push(this.parseExpr());
          if (this.current.type === T.COMMA) {
            this.eat(T.COMMA);
            continue;
          }
          break;
        }
      }
      this.eat(T.RPAREN);
      return new AST.PrintStmt(args, this.loc(nameTok));
    }
    if (tok.type === T.CHAR_LITERAL) {
      const t = this.eat(T.CHAR_LITERAL);
      // treat char as integer (C / C++ semantics)
      return new AST.IntLiteral(t.value.charCodeAt(0), this.loc(t));
    }

    if (tok.type === T.INT_LITERAL) {
      const t = this.eat(T.INT_LITERAL);
      return new AST.IntLiteral(t.value, this.loc(t));
    }
    if (tok.type === T.FLOAT_LITERAL) {
      const t = this.eat(T.FLOAT_LITERAL);
      return new AST.FloatLiteral(t.value, this.loc(t));
    }
    if (tok.type === T.BOOL_LITERAL) {
      const t = this.eat(T.BOOL_LITERAL);
      return new AST.BoolLiteral(t.value, this.loc(t));
    }
    if (tok.type === T.STRING_LITERAL) {
      const t = this.eat(T.STRING_LITERAL);
      return new AST.StringLiteral(t.value, this.loc(t));
    }

    if (tok.type === T.NULL) {
      const t = this.eat(T.NULL);
      return new AST.NullLiteral(this.loc(t));
    }

    // new Type()
    if (tok.type === T.NEW) {
      const nTok = this.eat(T.NEW);

      // only allow struct/class names here (as before)
      if (this.current.type !== T.IDENT) this.error("Expected type name after 'new'", this.loc(this.current));
      const tTok = this.eat(T.IDENT);
      const typeName = tTok.value;

      this.eat(T.LPAREN);
      const args = [];
      if (this.current.type !== T.RPAREN) {
        while (true) {
          args.push(this.parseExpr());
          if (this.current.type === T.COMMA) {
            this.eat(T.COMMA);
            continue;
          }
          break;
        }
      }
      this.eat(T.RPAREN);

      return new AST.NewExpr(typeName, args, this.loc(nTok));
    }

    if (tok.type === T.THIS) {
      const t = this.eat(T.THIS);
      return new AST.ThisExpr(this.loc(t));
    }

    if (tok.type === T.IDENT) {
      // v1.1: allow qualified identifiers a::b::c and template-ids like is_same<int,int>
      const parsePart = () => {
        const base = this.eat(T.IDENT).value;
        if (this.current.type !== T.LT) return base;
        // Disambiguation: treat `<` as a template-argument opener only when the
        // next token can start a type-name. This avoids breaking expressions like `x < 0`.
        const nxt = this.peek(1);
        const startsType = (
          nxt.type === T.CONST ||
          nxt.type === T.INT || nxt.type === T.FLOAT || nxt.type === T.BOOL || nxt.type === T.STRING || nxt.type === T.CHAR ||
          nxt.type === T.IDENT
        );
        if (!startsType) return base;

        // Lookahead to avoid mis-parsing relational expressions like `i < v.size()`.
        // We only treat this as a template-id if we can find a matching '>' before
        // hitting tokens that strongly suggest an expression chain ('.', '(', '[').
        let sawGt = false;
        for (let k = 1; k <= 40; k++) {
          const t = this.peek(k);
          if (!t) break;
          if (t.type === T.GT) { sawGt = true; break; }
          if (t.type === T.DOT || t.type === T.LPAREN || t.type === T.LBRACKET) { break; }
          // NOTE: do NOT break on COMMA — commas are valid inside template arg lists.
          if (t.type === T.SEMICOLON || t.type === T.RPAREN || t.type === T.RBRACE) { break; }
        }
        if (!sawGt) return base;

        // Parse template arguments as type-names (very lightweight).
        // This is used by std stubs such as is_same<int,int>::value.
        this.eat(T.LT);
        const args = [];
        if (this.current.type !== T.GT) {
          while (true) {
            args.push(this.parseTypeName().typeName);
            if (this.current.type === T.COMMA) {
              this.eat(T.COMMA);
              continue;
            }
            break;
          }
        }
        this.eat(T.GT);
        return `${base}<${args.join(",")}>`;
      };

      const parts = [parsePart()];
      while (this.current.type === T.SCOPE) {
        this.eat(T.SCOPE);
        parts.push(parsePart());
      }
      return new AST.VarExpr(parts.join("::"), this.loc(tok));
    }

    if (tok.type === T.LPAREN) {
      this.eat(T.LPAREN);
      const expr = this.parseExpr();
      this.eat(T.RPAREN);
      return expr;
    }

    this.error("Unexpected token in expression", this.loc(tok));
  }
}

module.exports = Parser;
module.exports.BUILD_ID = BUILD_ID;
