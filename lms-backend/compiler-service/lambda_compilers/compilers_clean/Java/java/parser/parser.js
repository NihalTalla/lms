// java/parser/parser.js (updated to support static methods for future-proofing, though not required for v2.4)
const { TOKENS } = require("../lexer/tokens");

const {
  Program,
  VarDeclaration,
  Assignment,
  PrintStatement,
  IntLiteral,
  Identifier,
  StringLiteral,
  BinaryExpression,
  CallExpression,
  WhileStatement,
   DoWhileStatement, 
  ArrayDeclaration,
  ArrayAssignment,
  AssertionStatement,
  ArrayAccess,
  ArrayLength,
  MethodDeclaration,
  ReturnStatement,
  IfStatement,
  BreakStatement,
  ContinueStatement,
  BooleanLiteral,
  LogicalExpression,
  UnaryExpression,
  UpdateExpression,
  SwitchStatement,
  CaseClause,
  TernaryExpression,
  ClassDeclaration,
  EnumDeclaration,
  ConstructorDeclaration,
  NewExpression,
  FieldAccess, 
  FieldAssignment,
  ThisExpression,
  CompoundAssignment,
  ForEachStatement,
  ForStatement
} = require("../ast/nodes");

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.current = tokens[this.pos];
    this.loopDepth = 0;
  }

  eat(type) {
    if (this.current.type === type) {
      this.pos++;
      this.current = this.tokens[this.pos];
    } else {
      throw new Error(`Parser error: expected ${type}, got ${this.current.type}`);
    }
  }

  parse() {
    return this.parseProgram();
  }

  parseAccessModifier() { // ← NEW helper
    if (this.current.type === TOKENS.PUBLIC) {
      this.eat(TOKENS.PUBLIC);
      return 'public';
    } else if (this.current.type === TOKENS.PRIVATE) {
      this.eat(TOKENS.PRIVATE);
      return 'private';
    }
    return 'public'; // Default if no modifier
  }

  /* ================= PROGRAM ================= */

  parseProgram() {
    const declarations = [];
    let mainBody = [];
    
    // Parse packages, imports, classes, interfaces, and enums until EOF
    while (this.current.type !== TOKENS.EOF) {
      if (this.current.type === TOKENS.PACKAGE) {
        // v8.0: Parse package declaration (skip for now)
        this.eat(TOKENS.PACKAGE);
        while (this.current.type !== TOKENS.SEMICOLON) {
          this.eat(this.current.type);
        }
        this.eat(TOKENS.SEMICOLON);
      } else if (this.current.type === TOKENS.IMPORT) {
        // v8.1: Parse import statement (skip for now)
        this.eat(TOKENS.IMPORT);
        while (this.current.type !== TOKENS.SEMICOLON) {
          this.eat(this.current.type);
        }
        this.eat(TOKENS.SEMICOLON);
      } else if (this.current.type === TOKENS.INTERFACE) {
        // v7.0: Parse interface declaration (placeholder)
        this.eat(TOKENS.INTERFACE);
        const interfaceName = this.current.value;
        this.eat(TOKENS.IDENTIFIER);
        this.eat(TOKENS.LBRACE);
        while (this.current.type !== TOKENS.RBRACE) {
          this.eat(this.current.type);
        }
        this.eat(TOKENS.RBRACE);
      } else if (this.current.type === TOKENS.CLASS) {
        const result = this.parseClass();
        declarations.push(result.classDecl);
        if (result.mainBody && result.mainBody.length > 0) {
          mainBody = result.mainBody;
        }
      } else if (this.current.type === TOKENS.ENUM) {
        // v5.0: Parse enum declaration
        declarations.push(this.parseEnum());
      } else if (this.current.type === TOKENS.ABSTRACT) {
        // v7.3: Abstract classes (skip abstract keyword for now)
        this.eat(TOKENS.ABSTRACT);
        if (this.current.type === TOKENS.CLASS) {
          const result = this.parseClass();
          declarations.push(result.classDecl);
          if (result.mainBody && result.mainBody.length > 0) {
            mainBody = result.mainBody;
          }
        }
      } else {
        break;
      }
    }
    
    return new Program([...declarations, ...mainBody]);
  }
  
  parseClass() {
    // class Name [extends SuperClass] [implements Interface1, Interface2...] {
    this.eat(TOKENS.CLASS);
    const className = this.current.value;
    this.eat(TOKENS.IDENTIFIER);
    
    // v4.0: Check for extends clause, default to Object if not present
    let superClass = "Object"; // v4.0: All classes implicitly extend Object
    if (this.current.type === TOKENS.EXTENDS) {
      this.eat(TOKENS.EXTENDS);
      superClass = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
    }
    
    // v7.0: Check for implements clause
    const implementedInterfaces = [];
    if (this.current.type === TOKENS.IMPLEMENTS) {
      this.eat(TOKENS.IMPLEMENTS);
      while (true) {
        implementedInterfaces.push(this.current.value);
        this.eat(TOKENS.IDENTIFIER);
        if (this.current.type === TOKENS.COMMA) {
          this.eat(TOKENS.COMMA);
        } else {
          break;
        }
      }
    }
    
    this.eat(TOKENS.LBRACE);

    const fields = [];
    const methods = [];
    const constructors = []; 
    let mainBody = [];

    while (this.current.type !== TOKENS.RBRACE) {
      let access = this.parseAccessModifier();
      let isStatic = false;
      
      // v7.3: Skip abstract keyword
      if (this.current.type === TOKENS.ABSTRACT) {
        this.eat(TOKENS.ABSTRACT);
      }
      
      if (this.current.type === TOKENS.STATIC) {
        this.eat(TOKENS.STATIC);
        isStatic = true;
      }

     // Fields: [public|private] [static] int/String/ArrayList/HashMap x;   or   [public|private] [static] int/String/ArrayList/HashMap x = expr;
// BUT NOT method declarations
// v4.2: Support ArrayList and HashMap types
if (
  (this.current.type === TOKENS.INT || 
   this.current.type === TOKENS.STRING_KW ||
   (this.current.type === TOKENS.IDENTIFIER && (this.current.value === "ArrayList" || this.current.value === "HashMap"))) &&  // int, String, ArrayList, or HashMap
  this.tokens[this.pos + 1]?.type === TOKENS.IDENTIFIER &&        // name
  (
    this.tokens[this.pos + 2]?.type === TOKENS.SEMICOLON ||       // int x; or String x;
    this.tokens[this.pos + 2]?.type === TOKENS.ASSIGN             // int x = ... or String x = ...
  )
) {
  let fieldType;
  if (this.current.type === TOKENS.INT) {
    fieldType = "int";
    this.eat(TOKENS.INT);
  } else if (this.current.type === TOKENS.STRING_KW) {
    fieldType = "String";
    this.eat(TOKENS.STRING_KW);
  } else if (this.current.value === "ArrayList") {
    fieldType = "ArrayList";
    this.eat(TOKENS.IDENTIFIER);
  } else if (this.current.value === "HashMap") {
    fieldType = "HashMap";
    this.eat(TOKENS.IDENTIFIER);
  } else if (this.current.value === "StringBuilder") {
    fieldType = "StringBuilder";
    this.eat(TOKENS.IDENTIFIER);
  }
  const name = this.current.value;
  this.eat(TOKENS.IDENTIFIER);

  let init = null;
  if (this.current.type === TOKENS.ASSIGN) {
    this.eat(TOKENS.ASSIGN);
    init = this.parseExpression();
  }

  this.eat(TOKENS.SEMICOLON);

  fields.push({
    access,
    isStatic: isStatic,
    type: fieldType,
    name,
    init
  });
  continue;
}

      // Main method: public [static] void main() { ... } — accept both with/without static
if (
  access === 'public' &&
  this.current.type === TOKENS.VOID &&
  this.tokens[this.pos + 1]?.type === TOKENS.MAIN   // ← changed from IDENTIFIER to MAIN
) {
  this.eat(TOKENS.VOID);
  this.eat(TOKENS.MAIN);                            // ← eat MAIN keyword, not IDENTIFIER
  this.eat(TOKENS.LPAREN);
  this.eat(TOKENS.RPAREN);
  this.eat(TOKENS.LBRACE);

  mainBody = [];
  while (this.current.type !== TOKENS.RBRACE) {
    mainBody.push(this.parseStatement());
  }
  this.eat(TOKENS.RBRACE);
  continue;
}

      // Methods: [public|private] [static] int/String/void method(...) { ... }
      if (this.current.type === TOKENS.INT || this.current.type === TOKENS.VOID || this.current.type === TOKENS.STRING_KW) {
        methods.push(this.parseMethodDeclaration(access, isStatic)); // ← Pass access and isStatic
        continue;
      }

      // Constructors: [public|private] Main(...) { ... }
      if (this.current.type === TOKENS.IDENTIFIER && this.current.value === className) {
        constructors.push(this.parseConstructor(className, access)); // ← Pass access
        continue;
      }

      throw new Error("Unexpected token in class: " + this.current.type);
    }

    this.eat(TOKENS.RBRACE);
    const classDecl = new ClassDeclaration(className, fields, methods, constructors, superClass);
    return { classDecl, mainBody };
  }

  // v5.0: Parse enum declaration
  parseEnum() {
    this.eat(TOKENS.ENUM);
    const name = this.current.value;
    this.eat(TOKENS.IDENTIFIER);
    this.eat(TOKENS.LBRACE);
    
    const values = [];
    while (this.current.type !== TOKENS.RBRACE) {
      const value = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      values.push(value);
      
      if (this.current.type === TOKENS.COMMA) {
        this.eat(TOKENS.COMMA);
      } else if (this.current.type !== TOKENS.RBRACE) {
        throw new Error("Expected comma or } in enum declaration");
      }
    }
    
    this.eat(TOKENS.RBRACE);
    return new EnumDeclaration(name, values);
  }

  /* ================= STATEMENTS ================= */

  parseStatement() {

    /* ---- switch (v1.7) ---- */
    if (this.current.type === TOKENS.SWITCH) {
      return this.parseSwitchStatement();
    }

    /* ---- ++ / -- (v1.5) ---- */
    if (
      this.current.type === TOKENS.INCREMENT ||
      this.current.type === TOKENS.DECREMENT
    ) {
      return this.parseUpdateStatement(true);
    }

    /* ---- break / continue ---- */
    if (this.current.type === TOKENS.BREAK) {
      this.eat(TOKENS.BREAK);
      this.eat(TOKENS.SEMICOLON);
      return new BreakStatement();
    }

    if (this.current.type === TOKENS.CONTINUE) {
      this.eat(TOKENS.CONTINUE);
      this.eat(TOKENS.SEMICOLON);
      return new ContinueStatement();
    }

    /* ---- control flow ---- */
    // v4.4: Enhanced for-each loop: for (Type var : collection)
    // v1.0: Classic for loop: for (init; test; update) body
    if (this.current.type === TOKENS.FOR) {
      // Check if it's a for-each loop (has colon) or regular for loop
      // Look ahead to see if we have: for (Type var : collection)
      // Use a separate variable for lookahead to avoid affecting this.pos
      let lookaheadPos = this.pos;
      let isForEach = false;
      if (this.tokens[lookaheadPos]?.type === TOKENS.FOR) {
        lookaheadPos++;
        if (this.tokens[lookaheadPos]?.type === TOKENS.LPAREN) {
          lookaheadPos++;
          // Check for type identifier colon pattern
          if (this.tokens[lookaheadPos]?.type === TOKENS.INT || 
              this.tokens[lookaheadPos]?.type === TOKENS.STRING_KW ||
              this.tokens[lookaheadPos]?.type === TOKENS.IDENTIFIER) {
            lookaheadPos++;
            if (this.tokens[lookaheadPos]?.type === TOKENS.IDENTIFIER) {
              lookaheadPos++;
              if (this.tokens[lookaheadPos]?.type === TOKENS.COLON) {
                isForEach = true;
              }
            }
          }
        }
      }
      if (isForEach) {
        return this.parseForEachStatement();
      }
      // Otherwise, it's a regular for loop
      return this.parseForStatement();
    }
if (this.current.type === TOKENS.DO) return this.parseDoWhileStatement();
if (this.current.type === TOKENS.IF) return this.parseIfStatement();
if (this.current.type === TOKENS.WHILE) return this.parseWhileStatement();
if (this.current.type === TOKENS.RETURN) return this.parseReturnStatement();

    /* ---- declarations ---- */
    if (
      this.current.type === TOKENS.INT &&
      this.tokens[this.pos + 1]?.type === TOKENS.LBRACKET
    ) {
      return this.parseArrayDeclaration();
    }

    // General var decl: int/String/className name = expr;
    if (
      [TOKENS.INT, TOKENS.STRING_KW, TOKENS.IDENTIFIER].includes(this.current.type) &&
      this.tokens[this.pos + 2]?.type === TOKENS.ASSIGN
    ) {
      return this.parseGeneralDeclaration();
    }

    if (this.current.type === TOKENS.SYSTEM) return this.parsePrintStatement();

    /* ================= RUNTIME CHECKS (v1.9) ================= */
    if (
      this.current.type === TOKENS.ASSERT ||
      this.current.type === TOKENS.REQUIRE ||
      this.current.type === TOKENS.ENSURE ||
      this.current.type === TOKENS.CHECK
    ) {
      const kind = this.current.type.toLowerCase();
      this.eat(this.current.type);

      const cond = this.parseExpression();
      this.eat(TOKENS.SEMICOLON);

      return new AssertionStatement(kind, cond);
    }

    /* ---- trap (v1.9) ---- */

    if (this.current.type === TOKENS.TRAP) {
      this.eat(TOKENS.TRAP);

      let msg;

      // trap("message");
      if (this.current.type === TOKENS.LPAREN) {
        this.eat(TOKENS.LPAREN);
        msg = this.current.value;
        this.eat(TOKENS.STRING);
        this.eat(TOKENS.RPAREN);
      }
      // trap "message";
      else {
        msg = this.current.value;
        this.eat(TOKENS.STRING);
      }

      this.eat(TOKENS.SEMICOLON);
      return new AssertionStatement("trap", msg);
    }

    /* ---- field assignment: obj.field = value; or this.field = value; ---- */
    if (
      (this.current.type === TOKENS.IDENTIFIER ||
       this.current.type === TOKENS.THIS) &&
      this.tokens[this.pos + 1]?.type === TOKENS.DOT &&
      this.tokens[this.pos + 3]?.type === TOKENS.ASSIGN  // peek for = after field name
    ) {
      let obj;

      if (this.current.type === TOKENS.THIS) {
        this.eat(TOKENS.THIS);
        obj = new ThisExpression();
      } else {
        obj = new Identifier(this.current.value);
        this.eat(TOKENS.IDENTIFIER);
      }

      this.eat(TOKENS.DOT);

      const field = this.current.value;
      this.eat(TOKENS.IDENTIFIER);

      this.eat(TOKENS.ASSIGN);
      const value = this.parseExpression();
      this.eat(TOKENS.SEMICOLON);

      return new FieldAssignment(obj, field, value);
    }

    // ---- new Object(); as statement (v2.0) ----
    if (this.current.type === TOKENS.NEW) {
      const expr = this.parseExpression();
      this.eat(TOKENS.SEMICOLON);
      return expr; // NewExpression node
    }

    if (
      this.current.type === TOKENS.IDENTIFIER &&
      [
        TOKENS.PLUS_ASSIGN,
        TOKENS.MINUS_ASSIGN,
        TOKENS.STAR_ASSIGN,
        TOKENS.SLASH_ASSIGN,
        TOKENS.PERCENT_ASSIGN,
        TOKENS.BIT_AND_ASSIGN,     // ← NEW
        TOKENS.BIT_OR_ASSIGN,      // ← NEW
        TOKENS.BIT_XOR_ASSIGN,     // ← NEW
        TOKENS.SHIFT_LEFT_ASSIGN,  // ← NEW
        TOKENS.SHIFT_RIGHT_ASSIGN  // ← NEW
      ].includes(this.tokens[this.pos + 1]?.type)
    ) {
      const name = this.current.value;
      this.eat(TOKENS.IDENTIFIER);

      const assignToken = this.current.type;
      this.eat(assignToken);

      const value = this.parseExpression();
      this.eat(TOKENS.SEMICOLON);

      let binOp;
      switch (assignToken) {
        case TOKENS.PLUS_ASSIGN:     binOp = TOKENS.PLUS;        break;
        case TOKENS.MINUS_ASSIGN:    binOp = TOKENS.MINUS;       break;
        case TOKENS.STAR_ASSIGN:     binOp = TOKENS.STAR;        break;
        case TOKENS.SLASH_ASSIGN:    binOp = TOKENS.SLASH;       break;
        case TOKENS.PERCENT_ASSIGN:  binOp = TOKENS.PERCENT;     break;

        case TOKENS.BIT_AND_ASSIGN:  binOp = TOKENS.BIT_AND;     break;  // ← NEW
        case TOKENS.BIT_OR_ASSIGN:   binOp = TOKENS.BIT_OR;      break;  // ← NEW
        case TOKENS.BIT_XOR_ASSIGN:  binOp = TOKENS.BIT_XOR;     break;  // ← NEW
        case TOKENS.SHIFT_LEFT_ASSIGN:  binOp = TOKENS.SHIFT_LEFT;  break;  // ← NEW
        case TOKENS.SHIFT_RIGHT_ASSIGN: binOp = TOKENS.SHIFT_RIGHT; break;  // ← NEW

        default:
          throw new Error(`Unsupported compound assignment: ${assignToken}`);
      }

      return new CompoundAssignment(name, binOp, value);
    }

    // Simple variable reassignment: x = expr; (fixes v0.5 and earlier tests)
    if (
      this.current.type === TOKENS.IDENTIFIER &&
      this.tokens[this.pos + 1]?.type === TOKENS.ASSIGN
    ) {
      const name = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      this.eat(TOKENS.ASSIGN);
      const value = this.parseExpression();
      this.eat(TOKENS.SEMICOLON);
      return new Assignment(name, value);
    }

    /* ---- identifier-led statements: assignment, update, method call ---- */
    if (this.current.type === TOKENS.IDENTIFIER || this.current.type === TOKENS.THIS) {
      const nextToken = this.tokens[this.pos + 1]?.type;

      if (nextToken === TOKENS.INCREMENT || nextToken === TOKENS.DECREMENT) {
        return this.parseUpdateStatement(false);
      }

      if (nextToken === TOKENS.LBRACKET) {
        return this.parseArrayAssignment();
      }

      const expr = this.parseExpression();
      this.eat(TOKENS.SEMICOLON);
      return expr;
    }

    // v7.1: Handle super() calls
    if (this.current.type === TOKENS.SUPER) {
      this.eat(TOKENS.SUPER);
      this.eat(TOKENS.LPAREN);
      const args = [];
      while (this.current.type !== TOKENS.RPAREN) {
        args.push(this.parseExpression());
        if (this.current.type === TOKENS.COMMA) {
          this.eat(TOKENS.COMMA);
        }
      }
      this.eat(TOKENS.RPAREN);
      this.eat(TOKENS.SEMICOLON);
      return new CallExpression(new Identifier("super"), args);
    }

    throw new Error("Unsupported statement: " + this.current.type);
  }

  /* ================= GENERAL DECL ================= */

  parseGeneralDeclaration() {
    // v4.2: Support ArrayList and HashMap types
    // v4.5: Support StringBuilder type
    let varType;
    if (this.current.type === TOKENS.INT) {
      varType = "int";
      this.eat(TOKENS.INT);
    } else if (this.current.type === TOKENS.STRING_KW) {
      varType = "String";
      this.eat(TOKENS.STRING_KW);
    } else if (this.current.type === TOKENS.IDENTIFIER) {
      varType = this.current.value; // ArrayList, HashMap, StringBuilder, or other class name
      this.eat(TOKENS.IDENTIFIER);
    } else {
      throw new Error(`Unexpected type token: ${this.current.type}`);
    }
    const name = this.current.value;
    this.eat(TOKENS.IDENTIFIER);
    this.eat(TOKENS.ASSIGN);
    const init = this.parseExpression();
    this.eat(TOKENS.SEMICOLON);
    return new VarDeclaration(varType, name, init);
  }

  /* ================= UPDATE ================= */

  parseUpdateStatement(prefix) {
    let op, name;

    if (prefix) {
      op = this.current.type;
      this.eat(op);
      name = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
    } else {
      name = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      op = this.current.type;
      this.eat(op);
    }

    this.eat(TOKENS.SEMICOLON);
    return new UpdateExpression(op, name, prefix);
  }

  /* ================= ASSIGNMENT ================= */

  parseAssignment() {
    console.log("FATAL DEBUG: parseAssignment() WAS CALLED — this should NEVER happen for method calls!");
    console.log("Current token when entering:", this.current.type, this.current?.value || "[no value]");
    console.log("Next token:", this.tokens[this.pos + 1]?.type);
    throw new Error("parseAssignment() called unexpectedly — check statement parsing order");

  }

  /* ================= SWITCH ================= */

  parseSwitchStatement() {
    this.eat(TOKENS.SWITCH);
    const disc = this.parseExpression();
    this.eat(TOKENS.LBRACE);

    const cases = [];
    let def = null;

    while (this.current.type !== TOKENS.RBRACE) {
      if (this.current.type === TOKENS.CASE) {
        this.eat(TOKENS.CASE);
        const value = new IntLiteral(this.current.value);
        this.eat(TOKENS.NUMBER);
        this.eat(TOKENS.COLON);

        const body = [];
        while (
          this.current.type !== TOKENS.BREAK &&
          this.current.type !== TOKENS.CASE &&
          this.current.type !== TOKENS.DEFAULT
        ) {
          body.push(this.parseStatement());
        }

        this.eat(TOKENS.BREAK);
        this.eat(TOKENS.SEMICOLON);
        cases.push(new CaseClause(value, body));
        continue;
      }

      if (this.current.type === TOKENS.DEFAULT) {
        this.eat(TOKENS.DEFAULT);
        this.eat(TOKENS.COLON);
        def = [];
        while (this.current.type !== TOKENS.RBRACE) {
          def.push(this.parseStatement());
        }
        break;
      }

      throw new Error("Invalid switch syntax");
    }

    this.eat(TOKENS.RBRACE);
    return new SwitchStatement(disc, cases, def);
  }

  /* ================= EXPRESSIONS ================= */

  parseExpression() {
    let expr = this.parseLogicalOr();
    if (this.current.type === TOKENS.QUESTION) {
      this.eat(TOKENS.QUESTION);
      const t = this.parseExpression();
      this.eat(TOKENS.COLON);
      const f = this.parseExpression();
      return new TernaryExpression(expr, t, f);
    }
    return expr;
  }

  parseLogicalOr() {
    let left = this.parseLogicalAnd();
    while (this.current.type === TOKENS.OR_OR) {
      this.eat(TOKENS.OR_OR);
      left = new LogicalExpression(left, "||", this.parseLogicalAnd());
    }
    return left;
  }

  parseLogicalAnd() {
    let left = this.parseBitwiseOr();
    while (this.current.type === TOKENS.AND_AND) {
      this.eat(TOKENS.AND_AND);
      left = new LogicalExpression(left, "&&", this.parseBitwiseOr());
    }
    return left;
  }

  /* ===== BITWISE / ARITHMETIC / PRIMARY ===== */

  // (unchanged and fully compatible with earlier versions)

  parseBitwiseOr() {
    // v4.4: Debug - check if we're in a bad state
    if (this.current && this.current.type === TOKENS.INT && this.pos < 50) {
      // This might be a for-each loop issue - check if we're parsing collection
      const context = new Error().stack;
      if (context && !context.includes('parseForEachStatement')) {
        // We're not in parseForEachStatement, so this might be a different issue
      }
    }
    let expr = this.parseBitwiseXor();
    while (this.current.type === TOKENS.BIT_OR) {
      const op = this.current.type;
      this.eat(op);
      expr = new BinaryExpression(expr, op, this.parseBitwiseXor());
    }
    return expr;
  }

  parseBitwiseXor() {
    let expr = this.parseBitwiseAnd();
    while (this.current.type === TOKENS.BIT_XOR) {
      const op = this.current.type;
      this.eat(op);
      expr = new BinaryExpression(expr, op, this.parseBitwiseAnd());
    }
    return expr;
  }

  parseBitwiseAnd() {
    let expr = this.parseShift();
    while (this.current.type === TOKENS.BIT_AND) {
      const op = this.current.type;
      this.eat(op);
      expr = new BinaryExpression(expr, op, this.parseShift());
    }
    return expr;
  }

  parseShift() {
    let expr = this.parseEquality();
    while (
      this.current.type === TOKENS.SHIFT_LEFT ||
      this.current.type === TOKENS.SHIFT_RIGHT
    ) {
      const op = this.current.type;
      this.eat(op);
      expr = new BinaryExpression(expr, op, this.parseEquality());
    }
    return expr;
  }

  parseEquality() {
    let left = this.parseRelational();
    while (
      this.current.type === TOKENS.EQ ||
      this.current.type === TOKENS.NE
    ) {
      const op = this.current.type;
      this.eat(op);
      left = new BinaryExpression(left, op, this.parseRelational());
    }
    return left;
  }

  parseRelational() {
    let left = this.parseAdditive();
    while (
      [TOKENS.GT, TOKENS.LT, TOKENS.GE, TOKENS.LE, TOKENS.INSTANCEOF].includes(this.current.type)
    ) {
      const op = this.current.type;
      this.eat(op);
      left = new BinaryExpression(left, op, this.parseAdditive());
    }
    return left;
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while ([TOKENS.PLUS, TOKENS.MINUS].includes(this.current.type)) {
      const op = this.current.type;
      this.eat(op);
      left = new BinaryExpression(left, op, this.parseMultiplicative());
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    while ([TOKENS.STAR, TOKENS.SLASH, TOKENS.PERCENT].includes(this.current.type)) {
      const op = this.current.type;
      this.eat(op);
      left = new BinaryExpression(left, op, this.parseUnary());
    }
    return left;
  }

  parseUnary() {
    if (
      this.current.type === TOKENS.NOT ||
      this.current.type === TOKENS.BIT_NOT
    ) {
      const op = this.current.type;
      this.eat(op);
      return new UnaryExpression(op, this.parseUnary());
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    let expr;

    if (this.current.type === TOKENS.NUMBER) {
      expr = new IntLiteral(this.current.value);
      this.eat(TOKENS.NUMBER);

    } else if (this.current.type === TOKENS.STRING) {
      expr = new StringLiteral(this.current.value);
      this.eat(TOKENS.STRING);

    } else if (this.current.type === TOKENS.TRUE) {
      this.eat(TOKENS.TRUE);
      expr = new BooleanLiteral(true);

    } else if (this.current.type === TOKENS.FALSE) {
      this.eat(TOKENS.FALSE);
      expr = new BooleanLiteral(false);

     } else if (this.current.type === TOKENS.THIS) {
      this.eat(TOKENS.THIS);
      expr = new ThisExpression();

     } else if (this.current.type === TOKENS.NEW) {
      this.eat(TOKENS.NEW);
      const className = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      this.eat(TOKENS.LPAREN);

      const args = [];
      if (this.current.type !== TOKENS.RPAREN) {
        while (true) {
          args.push(this.parseExpression());
          if (this.current.type === TOKENS.COMMA) this.eat(TOKENS.COMMA);
          else break;
        }
      }
      this.eat(TOKENS.RPAREN);
      expr = new NewExpression(className, args);

    } else if (this.current.type === TOKENS.IDENTIFIER) {
        const name = this.current.value;
        this.eat(TOKENS.IDENTIFIER);
        expr = new Identifier(name);

      } else if (this.current.type === TOKENS.LPAREN) {
        this.eat(TOKENS.LPAREN);
        expr = this.parseExpression();
        this.eat(TOKENS.RPAREN);

      } else {
        throw new Error(`Invalid expression: unexpected token ${this.current.type}${this.current.value ? ' (' + this.current.value + ')' : ''} at position ${this.pos}`);
      }

      /* ---------- POSTFIX CHAIN ---------- */
  while (true) {

     // function/method call: foo() or obj.method() or this.method() or new Test().method()
    if (this.current.type === TOKENS.LPAREN) {
      this.eat(TOKENS.LPAREN);
      const args = [];
      if (this.current.type !== TOKENS.RPAREN) {
        while (true) {
          args.push(this.parseExpression());
          if (this.current.type === TOKENS.COMMA) this.eat(TOKENS.COMMA);
          else break;
        }
      }
      this.eat(TOKENS.RPAREN);

      // Now expr can be Identifier, FieldAccess, ThisExpression chained, NewExpression chained, etc.
      expr = new CallExpression(expr, args);
      continue;
    }

    // array access: a[i]
    if (this.current.type === TOKENS.LBRACKET) {
      this.eat(TOKENS.LBRACKET);
      const idx = this.parseExpression();
      this.eat(TOKENS.RBRACKET);
      expr = new ArrayAccess(expr.name, idx);
      continue;
    }

    // ✅ array.length  (RESTORED — v0.7 / v0.8.1 FIX)
    // v4.5: Only match array.length if NOT followed by ( (to avoid matching sb.length() as array.length)
    if (
      this.current.type === TOKENS.DOT &&
      this.tokens[this.pos + 1]?.type === TOKENS.IDENTIFIER &&
      this.tokens[this.pos + 1]?.value === "length" &&
      this.tokens[this.pos + 2]?.type !== TOKENS.LPAREN  // v4.5: Not a method call
    ) {
      this.eat(TOKENS.DOT);
      this.eat(TOKENS.IDENTIFIER); // length
      expr = new ArrayLength(expr);
      continue;
    }

    // string.equals(expr)
    if (
      this.current.type === TOKENS.DOT &&
      this.tokens[this.pos + 1]?.value === "equals"
    ) {
      this.eat(TOKENS.DOT);
      this.eat(TOKENS.IDENTIFIER);
      this.eat(TOKENS.LPAREN);
      const arg = this.parseExpression();
      this.eat(TOKENS.RPAREN);
      expr = new CallExpression("equals", [expr, arg]);
      continue;
    }
    
    // obj.method() pattern - handles all method calls including toString, hashCode, getAge, etc.
    // Must check this BEFORE the field access handler to catch method calls
    if (
      this.current.type === TOKENS.DOT &&
      this.pos + 1 < this.tokens.length &&
      this.tokens[this.pos + 1] &&
      this.tokens[this.pos + 1].type === TOKENS.IDENTIFIER &&
      this.pos + 2 < this.tokens.length &&
      this.tokens[this.pos + 2] &&
      this.tokens[this.pos + 2].type === TOKENS.LPAREN
    ) {
      this.eat(TOKENS.DOT);
      const methodName = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      this.eat(TOKENS.LPAREN);
      const args = [];
      if (this.current.type !== TOKENS.RPAREN) {
        while (true) {
          args.push(this.parseExpression());
          if (this.current.type === TOKENS.COMMA) this.eat(TOKENS.COMMA);
          else break;
        }
      }
      this.eat(TOKENS.RPAREN);
      expr = new CallExpression(new FieldAccess(expr, methodName), args);
      continue;
    }
    
    // object field access: obj.field (not a method call)
    if (
      this.current.type === TOKENS.DOT &&
      this.tokens[this.pos + 1]?.type === TOKENS.IDENTIFIER
    ) {
      this.eat(TOKENS.DOT);
      const field = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      expr = new FieldAccess(expr, field);
      continue;
    }

    break;
  }


      return expr;
    }

    /* ================= REMAINING ================= */

    parseArrayDeclaration() {
      this.eat(TOKENS.INT);
      this.eat(TOKENS.LBRACKET);
      this.eat(TOKENS.RBRACKET);
      const name = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      this.eat(TOKENS.ASSIGN);
      this.eat(TOKENS.NEW);
      this.eat(TOKENS.INT);
      this.eat(TOKENS.LBRACKET);
      const size = this.parseExpression();
      this.eat(TOKENS.RBRACKET);
      this.eat(TOKENS.SEMICOLON);
      return new ArrayDeclaration(name, size);
    }

    parseArrayAssignment() {
      const name = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      this.eat(TOKENS.LBRACKET);
      const index = this.parseExpression();
      this.eat(TOKENS.RBRACKET);
      this.eat(TOKENS.ASSIGN);
      const value = this.parseExpression();
      this.eat(TOKENS.SEMICOLON);
      return new ArrayAssignment(name, index, value);
    }

    parsePrintStatement() {
      this.eat(TOKENS.SYSTEM);
      this.eat(TOKENS.DOT);
      this.eat(TOKENS.OUT);
      this.eat(TOKENS.DOT);
      this.eat(TOKENS.PRINTLN);
      this.eat(TOKENS.LPAREN);
      const expr = this.parseExpression();
      this.eat(TOKENS.RPAREN);
      this.eat(TOKENS.SEMICOLON);
      return new PrintStatement(expr);
    }

    parseIfStatement() {
      this.eat(TOKENS.IF);
      this.eat(TOKENS.LPAREN);
      const cond = this.parseExpression();
      this.eat(TOKENS.RPAREN);
      this.eat(TOKENS.LBRACE);

      const thenBody = [];
      while (this.current.type !== TOKENS.RBRACE)
        thenBody.push(this.parseStatement());
      this.eat(TOKENS.RBRACE);

      let elseBody = null;
      if (this.current.type === TOKENS.ELSE) {
        this.eat(TOKENS.ELSE);
        this.eat(TOKENS.LBRACE);
        elseBody = [];
        while (this.current.type !== TOKENS.RBRACE)
          elseBody.push(this.parseStatement());
        this.eat(TOKENS.RBRACE);
      }

      return new IfStatement(cond, thenBody, elseBody);
    }
parseDoWhileStatement() {
  this.eat(TOKENS.DO);
  this.eat(TOKENS.LBRACE);

  const body = [];
  this.loopDepth++;

  while (this.current.type !== TOKENS.RBRACE) {
    body.push(this.parseStatement());
  }

  this.loopDepth--;
  this.eat(TOKENS.RBRACE);

  this.eat(TOKENS.WHILE);
  this.eat(TOKENS.LPAREN);
  const test = this.parseExpression();
  this.eat(TOKENS.RPAREN);
  this.eat(TOKENS.SEMICOLON);

  return new DoWhileStatement(body, test);
}

    parseWhileStatement() {
      this.eat(TOKENS.WHILE);
      this.eat(TOKENS.LPAREN);
      const cond = this.parseExpression();
      this.eat(TOKENS.RPAREN);
      this.eat(TOKENS.LBRACE);

      this.loopDepth++;
      const body = [];
      while (this.current.type !== TOKENS.RBRACE)
        body.push(this.parseStatement());
      this.loopDepth--;

      this.eat(TOKENS.RBRACE);
      return new WhileStatement(cond, body);
    }

  // v4.4: Enhanced for-each loop parser
  parseForEachStatement() {
    this.eat(TOKENS.FOR);
    this.eat(TOKENS.LPAREN);
    
    // Parse variable type
    let varType;
    if (this.current.type === TOKENS.INT) {
      varType = "int";
      this.eat(TOKENS.INT);
    } else if (this.current.type === TOKENS.STRING_KW) {
      varType = "String";
      this.eat(TOKENS.STRING_KW);
    } else if (this.current.type === TOKENS.IDENTIFIER) {
      varType = this.current.value; // ArrayList, HashMap, or other class name
      this.eat(TOKENS.IDENTIFIER);
    } else {
      throw new Error(`Unexpected type in for-each loop: ${this.current.type}`);
    }
    
    // Parse variable name
    const varName = this.current.value;
    this.eat(TOKENS.IDENTIFIER);
    
    // Parse colon
    this.eat(TOKENS.COLON);
    
    // Parse collection expression (can be identifier, field access, method call, etc.)
    // For for-each loops, the collection is typically just an identifier
    // We'll parse it as a simple identifier for now to avoid parser state issues
    if (this.current.type !== TOKENS.IDENTIFIER && this.current.type !== TOKENS.THIS) {
      throw new Error(`Expected identifier or 'this' for collection in for-each loop, got ${this.current.type} at position ${this.pos}`);
    }
    
    let collection;
    if (this.current.type === TOKENS.THIS) {
      this.eat(TOKENS.THIS);
      collection = new ThisExpression();
    } else {
      const name = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      collection = new Identifier(name);
    }
    
    // For now, we only support simple identifiers as collections
    // Field access and method calls can be added later if needed
    
    // After parsing collection, we should be at RPAREN
    if (this.current.type !== TOKENS.RPAREN) {
      throw new Error(`Expected RPAREN after collection expression, got ${this.current.type}`);
    }
    this.eat(TOKENS.RPAREN);
    this.eat(TOKENS.LBRACE);
    
    this.loopDepth++;
    const body = [];
    while (this.current.type !== TOKENS.RBRACE)
      body.push(this.parseStatement());
    this.loopDepth--;
    
    this.eat(TOKENS.RBRACE);
    return new ForEachStatement(varType, varName, collection, body);
  }

  parseForStatement() {
    // v1.0: Classic for loop: for (init; test; update) body
    this.eat(TOKENS.FOR);
    this.eat(TOKENS.LPAREN);
    
    // Parse init (variable declaration or assignment or empty)
    let init = null;
    if (this.current.type !== TOKENS.SEMICOLON) {
      if (this.current.type === TOKENS.INT) {
        // int i = 0; or int i;
        this.eat(TOKENS.INT);
        const varName = this.current.value;
        this.eat(TOKENS.IDENTIFIER);
        let initialValue = null;
        if (this.current.type === TOKENS.ASSIGN) {
          this.eat(TOKENS.ASSIGN);
          initialValue = this.parseExpression();
        }
        init = new VarDeclaration(varName, "int", initialValue);
      } else {
        // i = 0 (assignment on existing variable) or other expression
        const expr = this.parseExpression();
        if (this.current.type === TOKENS.ASSIGN) {
          this.eat(TOKENS.ASSIGN);
          const value = this.parseExpression();
          init = new Assignment(expr.name, value);
        } else {
          init = expr;
        }
      }
    }
    this.eat(TOKENS.SEMICOLON);
    
    // Parse test (condition)
    let test = null;
    if (this.current.type !== TOKENS.SEMICOLON) {
      test = this.parseExpression();
    }
    this.eat(TOKENS.SEMICOLON);
    
    // Parse update (assignment or expression)
    let update = null;
    if (this.current.type !== TOKENS.RPAREN) {
      const expr = this.parseExpression();
      // Check for assignment in update
      if (this.current.type === TOKENS.ASSIGN) {
        this.eat(TOKENS.ASSIGN);
        const value = this.parseExpression();
        update = new Assignment(expr.name, value);
      } else if (this.current.type === TOKENS.PLUS_ASSIGN ||
                 this.current.type === TOKENS.MINUS_ASSIGN ||
                 this.current.type === TOKENS.MUL_ASSIGN ||
                 this.current.type === TOKENS.DIV_ASSIGN ||
                 this.current.type === TOKENS.MOD_ASSIGN ||
                 this.current.type === TOKENS.BIT_AND_ASSIGN ||
                 this.current.type === TOKENS.BIT_OR_ASSIGN ||
                 this.current.type === TOKENS.BIT_XOR_ASSIGN ||
                 this.current.type === TOKENS.SHL_ASSIGN ||
                 this.current.type === TOKENS.SHR_ASSIGN) {
        // Compound assignment
        const op = this.current.type;
        this.pos++;
        this.current = this.tokens[this.pos];
        const value = this.parseExpression();
        update = new CompoundAssignment(expr.name, op, value);
      } else {
        update = expr;
      }
    }
    this.eat(TOKENS.RPAREN);
    
    // Parse body
    this.eat(TOKENS.LBRACE);
    this.loopDepth++;
    const body = [];
    while (this.current.type !== TOKENS.RBRACE)
      body.push(this.parseStatement());
    this.loopDepth--;
    this.eat(TOKENS.RBRACE);
    
    return new ForStatement(init, test, update, body);
  }

   parseMethodDeclaration(access = 'public', isStatic = false) {
  const isVoid = this.current.type === TOKENS.VOID;
  const returnTypeToken = this.current.type;
  this.eat(returnTypeToken); // void, int, or String

  const name = this.current.value;
  this.eat(TOKENS.IDENTIFIER);

  this.eat(TOKENS.LPAREN);
  const params = [];
  if (this.current.type !== TOKENS.RPAREN) {
    while (true) {
      this.eat(TOKENS.INT);           // only int for now
      const paramName = this.current.value;
      this.eat(TOKENS.IDENTIFIER);
      params.push(paramName);
      if (this.current.type === TOKENS.COMMA) {
        this.eat(TOKENS.COMMA);
      } else {
        break;
      }
    }
  }
  this.eat(TOKENS.RPAREN);

  // v7.3: Handle abstract methods with just semicolon
  const body = [];
  if (this.current.type === TOKENS.SEMICOLON) {
    this.eat(TOKENS.SEMICOLON);
  } else {
    this.eat(TOKENS.LBRACE);
    while (this.current.type !== TOKENS.RBRACE) {
      body.push(this.parseStatement());
    }
    this.eat(TOKENS.RBRACE);
  }

  return new MethodDeclaration(
    name,
    params,
    body,
    isVoid,
    isStatic,
    access
  );
}

    // In parser.js - replace parseConstructor with this version

  parseConstructor(className,access = 'public') {
    if (this.current.value !== className) {
    throw new Error(`Constructor name must match class name: ${className}`);
  }
    this.eat(TOKENS.IDENTIFIER); 
    this.eat(TOKENS.LPAREN);
    
    const params = [];
    if (this.current.type !== TOKENS.RPAREN) {
      while (true) {
        // Support int and String parameters
        if (this.current.type !== TOKENS.INT && this.current.type !== TOKENS.STRING_KW) {
          throw new Error("Only int and String parameters supported in constructors");
        }
        this.eat(this.current.type);
        const paramName = this.current.value;
        this.eat(TOKENS.IDENTIFIER);
        params.push(paramName);

        if (this.current.type === TOKENS.COMMA) {
          this.eat(TOKENS.COMMA);
        } else {
          break;
        }
      }
    }

    this.eat(TOKENS.RPAREN);
    this.eat(TOKENS.LBRACE);

    const body = [];
    while (this.current.type !== TOKENS.RBRACE) {
      body.push(this.parseStatement());
    }

    this.eat(TOKENS.RBRACE);

    return new ConstructorDeclaration(className, params, body, access);
  }

    parseReturnStatement() {
      this.eat(TOKENS.RETURN);
      const value = this.parseExpression();
      this.eat(TOKENS.SEMICOLON);
      return new ReturnStatement(value);
    }
  }

module.exports = Parser;