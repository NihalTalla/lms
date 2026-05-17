// compiler/c/parser.js
// Recursive-descent parser for the C front-end.
// Produces AST nodes from compiler/c/ast.js using tokens from compiler/c/lexer.js.

const { TokenKind } = require("./tokens");
const AST = require("./ast");

// ------------------------------
// Parser error helper
// ------------------------------
function parseError(msg, tok) {
  const where = tok ? `${tok.line}:${tok.column}` : `?:?`;
  const got = tok ? `${tok.kind}${tok.value != null ? `(${tok.value})` : ""}` : "EOF";
  return new Error(`PARSE ERROR: ${msg}\n  at ${where}\n  got: ${got}`);
}

// ------------------------------
// Parser
// ------------------------------
class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;

    // Used to decide whether a var decl is global or local
    this._inFunction = false;

    // Track known struct tags (syntactic). Sema will validate/resolve fully.
    this._knownStructTags = new Set();
    
    // Track typedef names
    this._typedefNames = new Set();
    
    // Track enum names
    this._enumNames = new Set();
  }

  // -------- token utilities --------
  peek(n = 0) {
    return this.pos + n < this.tokens.length ? this.tokens[this.pos + n] : this.tokens[this.tokens.length - 1];
  }

  at(kind) {
    return this.peek().kind === kind;
  }

  eof() {
    return this.at(TokenKind.EOF);
  }

  consume() {
    return this.tokens[this.pos++];
  }

  expect(kind, msg = null) {
    const tok = this.peek();
    if (tok.kind !== kind) {
      throw parseError(msg || `Expected ${kind}`, tok);
    }
    return this.consume();
  }

  match(kind) {
    if (this.at(kind)) {
      return this.consume();
    }
    return null;
  }

  // ------------------------------
  // Entry
  // ------------------------------
  parseProgram() {
    const start = this.peek();
    const decls = [];

    while (!this.eof()) {
      // Top-level can be:
      // - struct declaration: struct S { ... };
      // - function decl/def: int f(int x) { ... } or int f(int x);
      // - global var: int x = 1;
      decls.push(this.parseTopLevelDecl());
    }

    return new AST.Program(decls, AST.loc(start.line, start.column));
  }

  parseTopLevelDecl() {
    // typedef
    if (this.at(TokenKind.KW_TYPEDEF)) {
      return this.parseTypedef();
    }
    
    // enum definition
    if (this.at(TokenKind.KW_ENUM)) {
      const t0 = this.peek();
      const t1 = this.peek(1);
      const t2 = this.peek(2);
      if (t1.kind === TokenKind.IDENTIFIER && t2.kind === TokenKind.LBRACE) {
        const ed = this.parseEnumDecl();
        this.expect(TokenKind.SEMICOLON, "Expected ';' after enum declaration");
        return ed;
      }
      // Otherwise it's a type-start for var/function
    }
    
    // struct definition at top-level
    if (this.at(TokenKind.KW_STRUCT)) {
      // Could be: struct S { ... };   OR   struct S x; (var decl)
      // We'll lookahead: struct IDENT {  => struct decl
      const t0 = this.peek();
      const t1 = this.peek(1);
      const t2 = this.peek(2);
      if (t1.kind === TokenKind.IDENTIFIER && t2.kind === TokenKind.LBRACE) {
        const sd = this.parseStructDecl();
        this.expect(TokenKind.SEMICOLON, "Expected ';' after struct declaration");
        return sd;
      }
      // Otherwise it's a type-start for var/function
    }

    // Otherwise: must start with a type
    const typeNode = this.parseTypeSpec();

    const nameTok = this.expect(TokenKind.IDENTIFIER, "Expected identifier after type");
    const name = nameTok.value;

    // Function?
    if (this.at(TokenKind.LPAREN)) {
      return this.parseFunctionAfterName(typeNode, nameTok);
    }

    // Global variable
    const decl = this.parseVarDeclAfterName(typeNode, nameTok, /*isGlobal*/ true);
    this.expect(TokenKind.SEMICOLON, "Expected ';' after global variable declaration");
    // Handle multiple declarations
    if (Array.isArray(decl)) {
      // For multiple declarations, we need to return them as separate top-level decls
      // But parseProgram expects a single decl per call, so we'll need to handle this differently
      // For now, just return the first one and add the rest to a list
      // Actually, we should handle this at the parseProgram level
      return decl[0]; // Return first, others will be lost - need to fix this
    }
    return decl;
  }

  // ------------------------------
  // Types
  // ------------------------------
  isTypeStart(tok = this.peek()) {
    switch (tok.kind) {
      case TokenKind.KW_INT:
      case TokenKind.KW_FLOAT:
      case TokenKind.KW_VOID:
      case TokenKind.KW_CHAR:
      case TokenKind.KW_STRUCT:
      case TokenKind.KW_ENUM:
      case TokenKind.KW_UNSIGNED:
      case TokenKind.KW_LONG:
      case TokenKind.KW_SHORT:
        return true;
      default:
        // Check if it's a typedef name
        if (tok.kind === TokenKind.IDENTIFIER && this._typedefNames && this._typedefNames.has(tok.value)) {
          return true;
        }
        return false;
    }
  }

  parseTypeSpec() {
    // base type
    const start = this.peek();
    
    // Handle unsigned, long, short modifiers
    let isUnsigned = false;
    let isLong = false;
    let isShort = false;
    
    if (this.match(TokenKind.KW_UNSIGNED)) {
      isUnsigned = true;
    }
    
    if (this.match(TokenKind.KW_LONG)) {
      isLong = true;
      if (this.match(TokenKind.KW_LONG)) {
        // long long
        isLong = false; // will be handled as "long long"
      }
    } else if (this.match(TokenKind.KW_SHORT)) {
      isShort = true;
    }

    let base;
    if (this.match(TokenKind.KW_INT)) {
      let typeName = "int";
      if (isLong) typeName = "long long";
      else if (isShort) typeName = "short";
      if (isUnsigned) typeName = "unsigned " + typeName;
      base = new AST.TypeName(typeName, AST.loc(start.line, start.column));
    } else if (this.match(TokenKind.KW_FLOAT)) {
      base = new AST.TypeName("float", AST.loc(start.line, start.column));
    } else if (this.match(TokenKind.KW_VOID)) {
      base = new AST.TypeName("void", AST.loc(start.line, start.column));
    } else if (this.match(TokenKind.KW_CHAR)) {
      let typeName = "char";
      if (isUnsigned) typeName = "unsigned char";
      base = new AST.TypeName(typeName, AST.loc(start.line, start.column));
    } else if (this.at(TokenKind.KW_STRUCT)) {
      this.consume(); // struct
      const tagTok = this.expect(TokenKind.IDENTIFIER, "Expected struct tag name");
      base = new AST.StructType(tagTok.value, AST.loc(start.line, start.column));
      // Track syntactically
      this._knownStructTags.add(tagTok.value);
    } else if (this.at(TokenKind.KW_ENUM)) {
      this.consume(); // enum
      const tagTok = this.expect(TokenKind.IDENTIFIER, "Expected enum tag name");
      base = new AST.EnumType(tagTok.value, AST.loc(start.line, start.column));
      this._enumNames.add(tagTok.value);
    } else if (this.at(TokenKind.IDENTIFIER) && this._typedefNames.has(this.peek().value)) {
      // Typedef name
      const nameTok = this.consume();
      base = new AST.TypeName(nameTok.value, AST.loc(start.line, start.column));
    } else {
      throw parseError("Expected type specifier", this.peek());
    }

    // pointers: '*'*
    while (this.match(TokenKind.STAR)) {
      const l = this.peek(-1) || start;
      base = new AST.PointerType(base, AST.loc(l.line, l.column));
    }

    return base;
  }

  // Optional array suffix on declarator: name [ expr? ] [ expr? ] ...
  // For now we support only one dimension and require literal/const expr later in sema.
  parseArraySuffix(typeNode) {
    let ty = typeNode;
    while (this.match(TokenKind.LBRACKET)) {
      let sizeExpr = null;
      if (!this.at(TokenKind.RBRACKET)) {
        sizeExpr = this.parseExpression();
      }
      const rb = this.expect(TokenKind.RBRACKET, "Expected ']'");
      ty = new AST.ArrayType(ty, sizeExpr, AST.loc(rb.line, rb.column));
    }
    return ty;
  }

  // ------------------------------
  // Struct declaration: struct S { <fields> }
  // ------------------------------
  parseStructDecl() {
    const start = this.expect(TokenKind.KW_STRUCT);
    const nameTok = this.expect(TokenKind.IDENTIFIER, "Expected struct tag name");
    const name = nameTok.value;

    this.expect(TokenKind.LBRACE, "Expected '{' in struct declaration");

    const fields = [];
    while (!this.at(TokenKind.RBRACE)) {
      if (!this.isTypeStart()) {
        throw parseError("Expected field type in struct", this.peek());
      }
      let fieldType = this.parseTypeSpec();
      const fieldNameTok = this.expect(TokenKind.IDENTIFIER, "Expected field name");
      let declType = this.parseArraySuffix(fieldType);
      this.expect(TokenKind.SEMICOLON, "Expected ';' after struct field");
      fields.push(new AST.StructFieldDecl(fieldNameTok.value, declType, AST.loc(fieldNameTok.line, fieldNameTok.column)));
    }

    this.expect(TokenKind.RBRACE, "Expected '}' to end struct declaration");
    this._knownStructTags.add(name);
    return new AST.StructDecl(name, fields, AST.loc(start.line, start.column));
  }

  parseTypedef() {
    const start = this.expect(TokenKind.KW_TYPEDEF);
    
    // Use parseTypeSpec but stop before consuming the identifier
    // We'll manually parse the type and then get the name
    let isUnsigned = false;
    let isLong = false;
    let isShort = false;
    
    if (this.match(TokenKind.KW_UNSIGNED)) {
      isUnsigned = true;
    }
    
    if (this.match(TokenKind.KW_LONG)) {
      isLong = true;
      if (this.match(TokenKind.KW_LONG)) {
        // long long - already handled
      }
    } else if (this.match(TokenKind.KW_SHORT)) {
      isShort = true;
    }
    
    // Parse base type (int is implicit if not specified)
    let baseType;
    if (this.match(TokenKind.KW_INT)) {
      // explicit int
    }
    // int is implicit if we have long/short/unsigned modifiers
    
    if (this.at(TokenKind.KW_CHAR)) {
      this.consume();
      let typeName = "char";
      if (isUnsigned) typeName = "unsigned char";
      baseType = new AST.TypeName(typeName, AST.loc(start.line, start.column));
    } else if (this.at(TokenKind.KW_STRUCT)) {
      baseType = this.parseTypeSpec();
    } else if (this.at(TokenKind.KW_ENUM)) {
      baseType = this.parseTypeSpec();
    } else {
      // Default to int (or long long if isLong was set)
      let typeName = "int";
      if (isLong) typeName = "long long";
      else if (isShort) typeName = "short";
      if (isUnsigned) typeName = "unsigned " + typeName;
      baseType = new AST.TypeName(typeName, AST.loc(start.line, start.column));
    }
    
    // Parse pointers
    while (this.match(TokenKind.STAR)) {
      const l = this.peek(-1) || start;
      baseType = new AST.PointerType(baseType, AST.loc(l.line, l.column));
    }
    
    const nameTok = this.expect(TokenKind.IDENTIFIER, "Expected typedef name");
    const name = nameTok.value;
    this.expect(TokenKind.SEMICOLON, "Expected ';' after typedef");
    this._typedefNames.add(name);
    return new AST.TypedefDecl(name, baseType, AST.loc(start.line, start.column));
  }

  parseEnumDecl() {
    const start = this.expect(TokenKind.KW_ENUM);
    const nameTok = this.expect(TokenKind.IDENTIFIER, "Expected enum tag name");
    const name = nameTok.value;
    
    this.expect(TokenKind.LBRACE, "Expected '{' in enum declaration");
    
    const values = [];
    let nextValue = 0;
    
    while (!this.at(TokenKind.RBRACE)) {
      const valueNameTok = this.expect(TokenKind.IDENTIFIER, "Expected enum value name");
      let valueExpr = null;
      
      if (this.match(TokenKind.ASSIGN)) {
        // Use parseAssignment() to avoid consuming commas that separate enum values
        valueExpr = this.parseAssignment();
        // Evaluate constant for next value
        if (valueExpr.kind === "IntLiteralExpr") {
          nextValue = parseInt(valueExpr.value, 10) + 1;
        }
      } else {
        // Use nextValue
        valueExpr = new AST.IntLiteralExpr(String(nextValue), AST.loc(valueNameTok.line, valueNameTok.column));
        nextValue++;
      }
      
      values.push({ name: valueNameTok.value, value: valueExpr });
      
      if (this.match(TokenKind.COMMA)) {
        continue;
      } else {
        break;
      }
    }
    
    this.expect(TokenKind.RBRACE, "Expected '}' to end enum declaration");
    this._enumNames.add(name);
    return new AST.EnumDecl(name, values, AST.loc(start.line, start.column));
  }

  // ------------------------------
  // Function parsing
  // ------------------------------
  parseFunctionAfterName(returnType, nameTok) {
    const start = nameTok;
    this.expect(TokenKind.LPAREN, "Expected '(' after function name");

    const params = [];
    if (!this.at(TokenKind.RPAREN)) {
      while (true) {
        // Parameter can be: <type> <name> [arraySuffix?]
        // Also allow "void" alone as "no params" only if it's exactly void and then ')'
        if (this.at(TokenKind.KW_VOID) && this.peek(1).kind === TokenKind.RPAREN) {
          // consume void and treat as empty params
          this.consume();
          break;
        }

        const pTypeStart = this.peek();
        if (!this.isTypeStart(pTypeStart)) {
          throw parseError("Expected parameter type", pTypeStart);
        }
        let pType = this.parseTypeSpec();
        const pNameTok = this.expect(TokenKind.IDENTIFIER, "Expected parameter name");
        pType = this.parseArraySuffix(pType);
        params.push(new AST.ParamDecl(pNameTok.value, pType, AST.loc(pNameTok.line, pNameTok.column)));

        if (this.match(TokenKind.COMMA)) continue;
        break;
      }
    }

    this.expect(TokenKind.RPAREN, "Expected ')' after parameters");

    // Prototype?
    if (this.match(TokenKind.SEMICOLON)) {
      return new AST.FunctionDecl(nameTok.value, params, returnType, null, true, AST.loc(start.line, start.column));
    }

    // Definition
    const prev = this._inFunction;
    this._inFunction = true;
    const body = this.parseBlockStmt();
    this._inFunction = prev;

    return new AST.FunctionDecl(nameTok.value, params, returnType, body, false, AST.loc(start.line, start.column));
  }

  // ------------------------------
  // Variable declaration
  // ------------------------------
  parseVarDeclAfterName(typeNode, nameTok, isGlobal) {
    const start = nameTok;
    let declType = this.parseArraySuffix(typeNode);

    let init = null;
    if (this.match(TokenKind.ASSIGN)) {
      // Check for initializer list: { ... }
      if (this.at(TokenKind.LBRACE)) {
        init = this.parseInitializerList();
      } else {
        // Parse assignment expression (stops at comma since comma has lower precedence)
        init = this.parseAssignment();
      }
    }

    const decl = new AST.VarDecl(nameTok.value, declType, init, isGlobal, AST.loc(start.line, start.column));
    
    // Check for multiple declarations: int a, b, c;
    const moreDecls = [];
    while (this.match(TokenKind.COMMA)) {
      // Check if next is semicolon (empty declaration) or identifier (next declaration)
      if (this.at(TokenKind.SEMICOLON)) {
        // Trailing comma, ignore
        break;
      }
      const nextNameTok = this.expect(TokenKind.IDENTIFIER, "Expected identifier in variable declaration list");
      let nextDeclType = this.parseArraySuffix(typeNode);
      let nextInit = null;
      if (this.match(TokenKind.ASSIGN)) {
        if (this.at(TokenKind.LBRACE)) {
          nextInit = this.parseInitializerList();
        } else {
          nextInit = this.parseAssignment();
        }
      }
      moreDecls.push(new AST.VarDecl(nextNameTok.value, nextDeclType, nextInit, isGlobal, AST.loc(nextNameTok.line, nextNameTok.column)));
    }
    
    if (moreDecls.length > 0) {
      // Return a list of declarations
      return [decl, ...moreDecls];
    }
    
    return decl;
  }


  parseInitializerList() {
    const start = this.expect(TokenKind.LBRACE);
    const elements = [];
    
    while (!this.at(TokenKind.RBRACE)) {
      if (this.eof()) {
        throw parseError("Unterminated initializer list", this.peek());
      }
      
      // Check for nested initializer list
      if (this.at(TokenKind.LBRACE)) {
        elements.push(this.parseInitializerList());
      } else {
        // Use parseAssignment() so commas separate elements (not comma-operator expressions)
        elements.push(this.parseAssignment());
      }
      
      if (this.match(TokenKind.COMMA)) {
        continue;
      } else {
        break;
      }
    }
    
    this.expect(TokenKind.RBRACE, "Expected '}' to end initializer list");
    return new AST.InitializerList(elements, AST.loc(start.line, start.column));
  }

  // In blocks, we need to parse either stmt or var decl.
  parseBlockItem() {
    if (this.isTypeStart()) {
      const typeNode = this.parseTypeSpec();
      const nameTok = this.expect(TokenKind.IDENTIFIER, "Expected identifier in variable declaration");
      const decl = this.parseVarDeclAfterName(typeNode, nameTok, /*isGlobal*/ false);
      this.expect(TokenKind.SEMICOLON, "Expected ';' after variable declaration");
      // Handle multiple declarations
      if (Array.isArray(decl)) {
        // Return as a block containing multiple declarations
        // We'll wrap them in a synthetic block or return them individually
        // For now, return the first one - the sema will handle the rest
        return decl; // Return array, parser needs to handle this
      }
      return decl;
    }
    return this.parseStatement();
  }

  // ------------------------------
  // Statements
  // ------------------------------
  parseStatement() {
    const tok = this.peek();

    if (this.at(TokenKind.LBRACE)) return this.parseBlockStmt();
    if (this.at(TokenKind.KW_IF)) return this.parseIfStmt();
    if (this.at(TokenKind.KW_WHILE)) return this.parseWhileStmt();
    if (this.at(TokenKind.KW_FOR)) return this.parseForStmt();
    if (this.at(TokenKind.KW_RETURN)) return this.parseReturnStmt();
    if (this.at(TokenKind.KW_BREAK)) {
      const t = this.consume();
      this.expect(TokenKind.SEMICOLON, "Expected ';' after break");
      return new AST.BreakStmt(AST.loc(t.line, t.column));
    }
    if (this.at(TokenKind.KW_CONTINUE)) {
      const t = this.consume();
      this.expect(TokenKind.SEMICOLON, "Expected ';' after continue");
      return new AST.ContinueStmt(AST.loc(t.line, t.column));
    }
    if (this.at(TokenKind.KW_SWITCH)) {
      return this.parseSwitchStmt();
    }
    if (this.at(TokenKind.KW_DO)) {
      return this.parseDoWhileStmt();
    }
    if (this.at(TokenKind.KW_GOTO)) {
      return this.parseGotoStmt();
    }
    // Label: statement
    if (this.at(TokenKind.IDENTIFIER) && this.peek(1).kind === TokenKind.COLON) {
      const labelTok = this.consume();
      this.consume(); // consume colon
      return new AST.LabelStmt(labelTok.value, this.parseStatement(), AST.loc(labelTok.line, labelTok.column));
    }

    // Expression statement (including empty ;)
    if (this.match(TokenKind.SEMICOLON)) {
      // empty stmt -> represent as ExprStmt(null)? We'll store as ExprStmt with a dummy literal 0?
      // Better: use an empty expression statement with a zero literal.
      const t = tok;
      return new AST.ExprStmt(new AST.IntLiteralExpr("0", AST.loc(t.line, t.column)), AST.loc(t.line, t.column));
    }

    const expr = this.parseExpression();
    this.expect(TokenKind.SEMICOLON, "Expected ';' after expression");
    return new AST.ExprStmt(expr, AST.loc(tok.line, tok.column));
  }

  parseBlockStmt() {
    const start = this.expect(TokenKind.LBRACE);
    const items = [];
    while (!this.at(TokenKind.RBRACE)) {
      if (this.eof()) throw parseError("Unterminated block; expected '}'", this.peek());
      const item = this.parseBlockItem();
      if (Array.isArray(item)) {
        // Multiple variable declarations
        items.push(...item);
      } else {
        items.push(item);
      }
    }
    this.expect(TokenKind.RBRACE, "Expected '}'");
    return new AST.BlockStmt(items, AST.loc(start.line, start.column));
  }
  
  // Helper to parse a statement that might be a block
  parseStatementOrBlock() {
    if (this.at(TokenKind.LBRACE)) {
      return this.parseBlockStmt();
    }
    return this.parseStatement();
  }

  parseIfStmt() {
    const start = this.expect(TokenKind.KW_IF);
    this.expect(TokenKind.LPAREN, "Expected '(' after if");
    const test = this.parseExpression();
    this.expect(TokenKind.RPAREN, "Expected ')' after if condition");
    const thenBranch = this.parseStatementOrBlock();
    let elseBranch = null;
    if (this.match(TokenKind.KW_ELSE)) {
      elseBranch = this.parseStatementOrBlock();
    }
    return new AST.IfStmt(test, thenBranch, elseBranch, AST.loc(start.line, start.column));
  }

  parseWhileStmt() {
    const start = this.expect(TokenKind.KW_WHILE);
    this.expect(TokenKind.LPAREN, "Expected '(' after while");
    const test = this.parseExpression();
    this.expect(TokenKind.RPAREN, "Expected ')' after while condition");
    const body = this.parseStatementOrBlock();
    return new AST.WhileStmt(test, body, AST.loc(start.line, start.column));
  }

  parseForStmt() {
    const start = this.expect(TokenKind.KW_FOR);
    this.expect(TokenKind.LPAREN, "Expected '(' after for");

    // init: either var decl, expr stmt, or empty
    let init = null;
    if (this.isTypeStart()) {
      const typeNode = this.parseTypeSpec();
      const nameTok = this.expect(TokenKind.IDENTIFIER, "Expected identifier in for-init declaration");
      const decl = this.parseVarDeclAfterName(typeNode, nameTok, /*isGlobal*/ false);
      this.expect(TokenKind.SEMICOLON, "Expected ';' after for-init declaration");
      init = Array.isArray(decl) ? decl : decl;
    } else if (this.match(TokenKind.SEMICOLON)) {
      init = null;
    } else {
      const e = this.parseExpression();
      this.expect(TokenKind.SEMICOLON, "Expected ';' after for-init expression");
      init = new AST.ExprStmt(e, AST.loc(start.line, start.column));
    }

    // test: expr or empty
    let test = null;
    if (!this.at(TokenKind.SEMICOLON)) {
      test = this.parseExpression();
    }
    this.expect(TokenKind.SEMICOLON, "Expected ';' after for-test");

    // update: expr or empty
    let update = null;
    if (!this.at(TokenKind.RPAREN)) {
      update = this.parseExpression();
    }
    this.expect(TokenKind.RPAREN, "Expected ')' after for clause");

    const body = this.parseStatementOrBlock();
    return new AST.ForStmt(init, test, update, body, AST.loc(start.line, start.column));
  }

  parseReturnStmt() {
    const start = this.expect(TokenKind.KW_RETURN);
    let value = null;
    if (!this.at(TokenKind.SEMICOLON)) {
      value = this.parseExpression();
    }
    this.expect(TokenKind.SEMICOLON, "Expected ';' after return");
    return new AST.ReturnStmt(value, AST.loc(start.line, start.column));
  }

  parseSwitchStmt() {
    const start = this.expect(TokenKind.KW_SWITCH);
    this.expect(TokenKind.LPAREN, "Expected '(' after switch");
    const test = this.parseExpression();
    this.expect(TokenKind.RPAREN, "Expected ')' after switch expression");
    this.expect(TokenKind.LBRACE, "Expected '{' after switch");

    const cases = [];
    let defaultCase = null;

    while (!this.at(TokenKind.RBRACE) && !this.eof()) {
      if (this.at(TokenKind.KW_CASE)) {
        const caseStart = this.consume();
        const value = this.parseExpression();
        this.expect(TokenKind.COLON, "Expected ':' after case value");
        
        const body = [];
        // Collect statements until next case/default/}
        while (!this.at(TokenKind.KW_CASE) && !this.at(TokenKind.KW_DEFAULT) && !this.at(TokenKind.RBRACE)) {
          if (this.eof()) {
            throw parseError("Unterminated switch statement", this.peek());
          }
          body.push(this.parseStatement());
        }
        
        cases.push({ value, body, loc: AST.loc(caseStart.line, caseStart.column) });
      } else if (this.at(TokenKind.KW_DEFAULT)) {
        const defaultStart = this.consume();
        this.expect(TokenKind.COLON, "Expected ':' after default");
        
        const body = [];
        while (!this.at(TokenKind.RBRACE)) {
          if (this.eof()) {
            throw parseError("Unterminated switch statement", this.peek());
          }
          body.push(this.parseStatement());
        }
        
        defaultCase = body;
      } else {
        throw parseError("Expected 'case' or 'default' in switch statement", this.peek());
      }
    }

    this.expect(TokenKind.RBRACE, "Expected '}' to end switch statement");
    return new AST.SwitchStmt(test, cases, defaultCase, AST.loc(start.line, start.column));
  }

  parseDoWhileStmt() {
    const start = this.expect(TokenKind.KW_DO);
    const body = this.parseStatementOrBlock();
    this.expect(TokenKind.KW_WHILE, "Expected 'while' after do");
    this.expect(TokenKind.LPAREN, "Expected '(' after while");
    const test = this.parseExpression();
    this.expect(TokenKind.RPAREN, "Expected ')' after while condition");
    this.expect(TokenKind.SEMICOLON, "Expected ';' after do-while");
    return new AST.DoWhileStmt(body, test, AST.loc(start.line, start.column));
  }

  parseGotoStmt() {
    const start = this.expect(TokenKind.KW_GOTO);
    const labelTok = this.expect(TokenKind.IDENTIFIER, "Expected label name after goto");
    this.expect(TokenKind.SEMICOLON, "Expected ';' after goto");
    return new AST.GotoStmt(labelTok.value, AST.loc(start.line, start.column));
  }

  // ------------------------------
  // Expressions (precedence climbing)
  // ------------------------------
  parseExpression() {
    return this.parseComma();
  }

  parseComma() {
    let expr = this.parseTernary();
    while (this.match(TokenKind.COMMA)) {
      const opTok = this.peek(-1);
      const rhs = this.parseTernary();
      expr = new AST.CommaExpr(expr, rhs, AST.loc(opTok.line, opTok.column));
    }
    return expr;
  }

  parseTernary() {
    let expr = this.parseAssignment();
    if (this.match(TokenKind.QUESTION)) {
      const questionTok = this.peek(-1);
      const thenExpr = this.parseExpression();
      this.expect(TokenKind.COLON, "Expected ':' in ternary operator");
      const elseExpr = this.parseTernary(); // right-associative
      expr = new AST.TernaryExpr(expr, thenExpr, elseExpr, AST.loc(questionTok.line, questionTok.column));
    }
    return expr;
  }

  parseAssignment() {
    const start = this.peek();
    let expr = this.parseLogicalOr();

    // Check for compound assignment operators
    if (this.match(TokenKind.ASSIGN)) {
      const value = this.parseAssignment(); // right-associative
      expr = new AST.AssignExpr(expr, value, AST.loc(start.line, start.column));
    } else if (this.match(TokenKind.PLUS_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "+=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.MINUS_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "-=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.STAR_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "*=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.SLASH_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "/=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.PERCENT_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "%=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.AMP_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "&=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.PIPE_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "|=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.CARET_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "^=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.SHL_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, "<<=", value, AST.loc(opTok.line, opTok.column));
    } else if (this.match(TokenKind.SHR_ASSIGN)) {
      const opTok = this.peek(-1);
      const value = this.parseAssignment();
      expr = new AST.CompoundAssignExpr(expr, ">>=", value, AST.loc(opTok.line, opTok.column));
    }

    return expr;
  }

  parseLogicalOr() {
    let expr = this.parseLogicalAnd();
    while (this.match(TokenKind.LOGICAL_OR)) {
      const opTok = this.peek(-1);
      const rhs = this.parseLogicalAnd();
      expr = new AST.BinaryExpr("||", expr, rhs, AST.loc(opTok.line, opTok.column));
    }
    return expr;
  }

  parseLogicalAnd() {
    let expr = this.parseBitwiseOr();
    while (this.match(TokenKind.LOGICAL_AND)) {
      const opTok = this.peek(-1);
      const rhs = this.parseBitwiseOr();
      expr = new AST.BinaryExpr("&&", expr, rhs, AST.loc(opTok.line, opTok.column));
    }
    return expr;
  }

  parseBitwiseOr() {
    let expr = this.parseBitwiseXor();
    while (this.match(TokenKind.PIPE)) {
      const opTok = this.peek(-1);
      const rhs = this.parseBitwiseXor();
      expr = new AST.BinaryExpr("|", expr, rhs, AST.loc(opTok.line, opTok.column));
    }
    return expr;
  }

  parseBitwiseXor() {
    let expr = this.parseBitwiseAnd();
    while (this.match(TokenKind.CARET)) {
      const opTok = this.peek(-1);
      const rhs = this.parseBitwiseAnd();
      expr = new AST.BinaryExpr("^", expr, rhs, AST.loc(opTok.line, opTok.column));
    }
    return expr;
  }

  parseBitwiseAnd() {
    let expr = this.parseEquality();
    while (this.match(TokenKind.AMP)) {
      const opTok = this.peek(-1);
      const rhs = this.parseEquality();
      expr = new AST.BinaryExpr("&", expr, rhs, AST.loc(opTok.line, opTok.column));
    }
    return expr;
  }

  parseEquality() {
    let expr = this.parseRelational();
    while (true) {
      if (this.match(TokenKind.EQ)) {
        const opTok = this.peek(-1);
        const rhs = this.parseRelational();
        expr = new AST.BinaryExpr("==", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else if (this.match(TokenKind.NEQ)) {
        const opTok = this.peek(-1);
        const rhs = this.parseRelational();
        expr = new AST.BinaryExpr("!=", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else {
        break;
      }
    }
    return expr;
  }

  parseRelational() {
    let expr = this.parseShift();
    while (true) {
      if (this.match(TokenKind.LT)) {
        const opTok = this.peek(-1);
        const rhs = this.parseShift();
        expr = new AST.BinaryExpr("<", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else if (this.match(TokenKind.LTE)) {
        const opTok = this.peek(-1);
        const rhs = this.parseShift();
        expr = new AST.BinaryExpr("<=", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else if (this.match(TokenKind.GT)) {
        const opTok = this.peek(-1);
        const rhs = this.parseShift();
        expr = new AST.BinaryExpr(">", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else if (this.match(TokenKind.GTE)) {
        const opTok = this.peek(-1);
        const rhs = this.parseShift();
        expr = new AST.BinaryExpr(">=", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else {
        break;
      }
    }
    return expr;
  }

  parseShift() {
    let expr = this.parseAdditive();
    while (true) {
      if (this.match(TokenKind.SHL)) {
        const opTok = this.peek(-1);
        const rhs = this.parseAdditive();
        expr = new AST.BinaryExpr("<<", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else if (this.match(TokenKind.SHR)) {
        const opTok = this.peek(-1);
        const rhs = this.parseAdditive();
        expr = new AST.BinaryExpr(">>", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else {
        break;
      }
    }
    return expr;
  }

  parseAdditive() {
    let expr = this.parseMultiplicative();
    while (true) {
      if (this.match(TokenKind.PLUS)) {
        const opTok = this.peek(-1);
        const rhs = this.parseMultiplicative();
        expr = new AST.BinaryExpr("+", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else if (this.match(TokenKind.MINUS)) {
        const opTok = this.peek(-1);
        const rhs = this.parseMultiplicative();
        expr = new AST.BinaryExpr("-", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else {
        break;
      }
    }
    return expr;
  }

  parseMultiplicative() {
    let expr = this.parseUnary();
    while (true) {
      if (this.match(TokenKind.STAR)) {
        const opTok = this.peek(-1);
        const rhs = this.parseUnary();
        expr = new AST.BinaryExpr("*", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else if (this.match(TokenKind.SLASH)) {
        const opTok = this.peek(-1);
        const rhs = this.parseUnary();
        expr = new AST.BinaryExpr("/", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else if (this.match(TokenKind.PERCENT)) {
        const opTok = this.peek(-1);
        const rhs = this.parseUnary();
        expr = new AST.BinaryExpr("%", expr, rhs, AST.loc(opTok.line, opTok.column));
      } else {
        break;
      }
    }
    return expr;
  }

  parseUnary() {
    const tok = this.peek();

    // sizeof
    if (this.match(TokenKind.KW_SIZEOF)) {
      const st = tok;
      // sizeof ( type ) OR sizeof unary
      if (this.match(TokenKind.LPAREN)) {
        if (this.isTypeStart()) {
          const t = this.parseTypeSpec();
          this.expect(TokenKind.RPAREN, "Expected ')' after sizeof(type)");
          return new AST.SizeofExpr(t, true, AST.loc(st.line, st.column));
        } else {
          const e = this.parseExpression();
          this.expect(TokenKind.RPAREN, "Expected ')' after sizeof(expr)");
          return new AST.SizeofExpr(e, false, AST.loc(st.line, st.column));
        }
      }
      const e = this.parseUnary();
      return new AST.SizeofExpr(e, false, AST.loc(st.line, st.column));
    }

    // Pre-increment/decrement: ++x, --x
    if (this.match(TokenKind.PLUS_PLUS)) {
      const opTok = tok;
      const e = this.parseUnary();
      return new AST.UnaryExpr("++", e, AST.loc(opTok.line, opTok.column));
    }
    if (this.match(TokenKind.MINUS_MINUS)) {
      const opTok = tok;
      const e = this.parseUnary();
      return new AST.UnaryExpr("--", e, AST.loc(opTok.line, opTok.column));
    }

    // unary ops: ! - * & ~
    if (this.match(TokenKind.LOGICAL_NOT)) {
      const opTok = tok;
      const e = this.parseUnary();
      return new AST.UnaryExpr("!", e, AST.loc(opTok.line, opTok.column));
    }
    if (this.match(TokenKind.MINUS)) {
      const opTok = tok;
      const e = this.parseUnary();
      return new AST.UnaryExpr("-", e, AST.loc(opTok.line, opTok.column));
    }
    if (this.match(TokenKind.STAR)) {
      const opTok = tok;
      const e = this.parseUnary();
      return new AST.UnaryExpr("*", e, AST.loc(opTok.line, opTok.column));
    }
    if (this.match(TokenKind.AMP)) {
      const opTok = tok;
      const e = this.parseUnary();
      return new AST.UnaryExpr("&", e, AST.loc(opTok.line, opTok.column));
    }
    if (this.match(TokenKind.TILDE)) {
      const opTok = tok;
      const e = this.parseUnary();
      return new AST.UnaryExpr("~", e, AST.loc(opTok.line, opTok.column));
    }

    return this.parsePostfix();
  }

  parsePostfix() {
    let expr = this.parsePrimary();

    while (true) {
      // Post-increment/decrement: x++, x--
      if (this.match(TokenKind.PLUS_PLUS)) {
        const opTok = this.peek(-1);
        expr = new AST.PostfixExpr("++", expr, AST.loc(opTok.line, opTok.column));
        continue;
      }
      if (this.match(TokenKind.MINUS_MINUS)) {
        const opTok = this.peek(-1);
        expr = new AST.PostfixExpr("--", expr, AST.loc(opTok.line, opTok.column));
        continue;
      }

      // call
      if (this.match(TokenKind.LPAREN)) {
        const args = [];
        if (!this.at(TokenKind.RPAREN)) {
          while (true) {
            // Use parseAssignment() instead of parseExpression() to avoid consuming commas
            // that are part of the argument list (not comma operators)
            args.push(this.parseAssignment());
            if (this.match(TokenKind.COMMA)) continue;
            break;
          }
        }
        const rp = this.expect(TokenKind.RPAREN, "Expected ')' after arguments");
        expr = new AST.CallExpr(expr, args, AST.loc(rp.line, rp.column));
        continue;
      }

      // indexing
      if (this.match(TokenKind.LBRACKET)) {
        const idx = this.parseExpression();
        const rb = this.expect(TokenKind.RBRACKET, "Expected ']'");
        expr = new AST.IndexExpr(expr, idx, AST.loc(rb.line, rb.column));
        continue;
      }

      // member access: . or ->
      if (this.match(TokenKind.DOT)) {
        const dot = this.peek(-1);
        const fieldTok = this.expect(TokenKind.IDENTIFIER, "Expected field name after '.'");
        expr = new AST.MemberExpr(expr, fieldTok.value, false, AST.loc(dot.line, dot.column));
        continue;
      }
      if (this.match(TokenKind.ARROW)) {
        const ar = this.peek(-1);
        const fieldTok = this.expect(TokenKind.IDENTIFIER, "Expected field name after '->'");
        expr = new AST.MemberExpr(expr, fieldTok.value, true, AST.loc(ar.line, ar.column));
        continue;
      }

      break;
    }

    return expr;
  }

  parsePrimary() {
    const tok = this.peek();

    // Parenthesized expression or cast: ( type ) unary
    if (this.match(TokenKind.LPAREN)) {
      const lp = tok;
      if (this.isTypeStart()) {
        // Try cast: (type) unary
        const t = this.parseTypeSpec();
        this.expect(TokenKind.RPAREN, "Expected ')' after cast type");
        const e = this.parseUnary();
        return new AST.CastExpr(t, e, AST.loc(lp.line, lp.column));
      }

      const e = this.parseExpression();
      this.expect(TokenKind.RPAREN, "Expected ')'");
      return e;
    }

    // Literals
    if (this.match(TokenKind.INT_LITERAL)) {
      const t = tok;
      return new AST.IntLiteralExpr(t.value, AST.loc(t.line, t.column));
    }
    if (this.match(TokenKind.FLOAT_LITERAL)) {
      const t = tok;
      return new AST.FloatLiteralExpr(t.value, AST.loc(t.line, t.column));
    }
    if (this.match(TokenKind.CHAR_LITERAL)) {
      const t = tok;
      return new AST.CharLiteralExpr(t.value, AST.loc(t.line, t.column));
    }
    if (this.match(TokenKind.STRING_LITERAL)) {
      const t = tok;
      return new AST.StringLiteralExpr(t.value, AST.loc(t.line, t.column));
    }

    // Identifier
    if (this.match(TokenKind.IDENTIFIER)) {
      const t = tok;
      return new AST.IdentifierExpr(t.value, AST.loc(t.line, t.column));
    }

    throw parseError("Unexpected token in expression", tok);
  }
}

// ------------------------------
// Exports
// ------------------------------
module.exports = {
  Parser,
};
