const AST = require('./ast');

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
    this.inFunction = false;
  }

  current() { return this.tokens[this.pos]; }
  peek(n = 1) { return this.tokens[this.pos + n]; }

  eat(type) {
    const t = this.current();
    if (!t || t.type !== type) {
      const loc = t && typeof t.line === 'number' ? ` at ${t.line}:${t.col || 1}` : '';
      const got = t ? `${t.type}${t.value !== undefined ? `(${t.value})` : ''}` : 'EOF';
      throw new Error(`Expected ${type}, got ${got}${loc}`);
    }
    this.pos++;
    return t;
  }

  skipNewlines() {
    while (this.current()?.type === 'NEWLINE') this.pos++;
  }

  /* ================= EXPRESSIONS ================= */

  factor() {
    const t = this.current();

    if (t.type === 'NUMBER') {
      this.eat('NUMBER');
      return new AST.NumberNode(t.value);
    }

    if (t.type === 'STRING') {
      this.eat('STRING');
      let node = new AST.StringNode(t.value);
      
      // Check for attribute access: "string".method
      if (this.current()?.type === '.') {
        node = this.parseAttributeChain(node);
      }
      
      // Check for method call: "string".method()
      if (this.current()?.type === '(') {
        return this.parseCall(node);
      }
      
      return node;
    }

    if (t.type === 'TRUE') {
      this.eat('TRUE');
      return new AST.NumberNode(true);
    }

    if (t.type === 'FALSE') {
      this.eat('FALSE');
      return new AST.NumberNode(false);
    }

    if (t.type === 'NOT') {
      this.eat('NOT');
      return new AST.UnaryOpNode('not', this.factor());
    }

    if (t.type === '-') {
      this.eat('-');
      return new AST.UnaryOpNode('-', this.factor());
    }

    if (t.type === '(') {
      this.eat('(');
      // Check if it's a tuple (comma inside) or just parentheses
      if (this.current()?.type === ')') {
        // Empty tuple
        this.eat(')');
        return new AST.TupleNode([]);
      }
      
      const first = this.expression();
      
      // If there's a comma, it's a tuple
      if (this.current()?.type === ',') {
        this.eat(',');
        const elements = [first];
        
        // Check for trailing comma (single-element tuple)
        if (this.current()?.type === ')') {
          this.eat(')');
          return new AST.TupleNode(elements);
        }
        
        // Multiple elements
        while (this.current()?.type !== ')') {
          elements.push(this.expression());
          if (this.current()?.type === ',') {
            this.eat(',');
            if (this.current()?.type === ')') {
              // Trailing comma allowed
              this.eat(')');
              return new AST.TupleNode(elements);
            }
          } else {
            break;
          }
        }
        this.eat(')');
        return new AST.TupleNode(elements);
      }
      
      // Just parentheses, not a tuple
      this.eat(')');
      return first;
    }

    if (t.type === '[') {
      this.eat('[');
      
      // Check if it's a comprehension: [expr for ...]
      if (this.current()?.type !== ']') {
        const firstExpr = this.expression();
        
        // Check if next token is 'for' (comprehension)
        if (this.current()?.type === 'FOR') {
          this.eat('FOR');
          const target = this.current();
          if (target?.type !== 'IDENTIFIER') {
            throw new Error("Expected identifier in comprehension");
          }
          this.eat('IDENTIFIER');
          const targetName = target.value;
          
          this.eat('IN');
          // Parse iterable - need to parse at factor level to avoid ternary issues
          // Use a helper that parses expressions but stops before ternary
          const iterable = this.logicalOr();
          
          // Check for optional 'if' condition
          // Use logicalOr to avoid ternary parsing (ternary is at expression level)
          let condition = null;
          if (this.current()?.type === 'IF') {
            this.eat('IF');
            condition = this.logicalOr(); // Parse condition (supports 'or' and 'and')
          }
          
          this.eat(']');
          return new AST.ListCompNode(firstExpr, targetName, iterable, condition);
        }
        
        // Regular list literal
        const els = [firstExpr];
        while (this.current()?.type === ',') {
          this.eat(',');
          if (this.current()?.type === ']') break; // Trailing comma
          els.push(this.expression());
        }
        this.eat(']');
        return new AST.ListNode(els);
      }
      
      // Empty list
      this.eat(']');
      return new AST.ListNode([]);
    }

    /* ---------- DICTIONARY / SET LITERAL ---------- */
    if (t.type === '{') {
      this.eat('{');
      if (this.current()?.type === '}') {
        // Empty - could be dict or set, default to dict
        this.eat('}');
        return new AST.DictNode([]);
      }
      
      // Peek ahead to see if it's a dict (has ':') or set (no ':')
      let isDict = false;
      let peekPos = this.pos;
      while (peekPos < this.tokens.length && this.tokens[peekPos].type !== '}' && this.tokens[peekPos].type !== ':') {
        peekPos++;
      }
      if (peekPos < this.tokens.length && this.tokens[peekPos].type === ':') {
        isDict = true;
      }
      
      if (isDict) {
        // Check if it's a dict comprehension: {key: value for ...}
        const key = this.expression();
        this.eat(':');
        const value = this.expression();
        
        // Check if next token is 'for' (comprehension)
        if (this.current()?.type === 'FOR') {
          this.eat('FOR');
          const target = this.current();
          if (target?.type !== 'IDENTIFIER') {
            throw new Error("Expected identifier in comprehension");
          }
          this.eat('IDENTIFIER');
          const targetName = target.value;
          
          this.eat('IN');
          // Parse iterable without ternary parsing (avoids treating `if` as ternary)
          const iterable = this.logicalOr();
          
          // Check for optional 'if' condition
          // Note: Use logicalOr() instead of expression() to avoid ternary parsing
          let condition = null;
          if (this.current()?.type === 'IF') {
            this.eat('IF');
            condition = this.logicalOr(); // Parse condition (supports 'or' / 'and')
          }
          
          this.eat('}');
          return new AST.DictCompNode(key, value, targetName, iterable, condition);
        }
        
        // Regular dictionary: key:value pairs
        const pairs = [[key, value]];
        while (this.current()?.type === ',') {
          this.eat(',');
          if (this.current()?.type === '}') break; // Trailing comma
          const key = this.expression();
          this.eat(':');
          const value = this.expression();
          pairs.push([key, value]);
        }
        this.eat('}');
        return new AST.DictNode(pairs);
      } else {
        // Check if it's a set comprehension: {expr for ...}
        const firstExpr = this.expression();
        
        // Check if next token is 'for' (comprehension)
        if (this.current()?.type === 'FOR') {
          this.eat('FOR');
          const target = this.current();
          if (target?.type !== 'IDENTIFIER') {
            throw new Error("Expected identifier in comprehension");
          }
          this.eat('IDENTIFIER');
          const targetName = target.value;
          
          this.eat('IN');
          // Parse iterable without ternary parsing (avoids treating `if` as ternary)
          const iterable = this.logicalOr();
          
          // Check for optional 'if' condition
          // Note: Use logicalOr() instead of expression() to avoid ternary parsing
          let condition = null;
          if (this.current()?.type === 'IF') {
            this.eat('IF');
            condition = this.logicalOr(); // Parse condition (supports 'or' / 'and')
          }
          
          this.eat('}');
          return new AST.SetCompNode(firstExpr, targetName, iterable, condition);
        }
        
        // Regular set: just values
        const elements = [firstExpr];
        while (this.current()?.type === ',') {
          this.eat(',');
          if (this.current()?.type === '}') break; // Trailing comma
          elements.push(this.expression());
        }
        this.eat('}');
        return new AST.SetNode(elements);
      }
    }

    /* ---------- SUPER() CALL (v2.0) ---------- */
    if (t.type === 'IDENTIFIER' && t.value === 'super' && this.peek()?.type === '(') {
      this.eat('IDENTIFIER');
      this.eat('(');
      this.eat(')'); // super() takes no arguments in v2.0
      let superNode = new AST.SuperNode();
      // Check for attribute access: super().method
      if (this.current()?.type === '.') {
        superNode = this.parseAttributeChain(superNode);
      }
      // Check for method call: super().method()
      if (this.current()?.type === '(') {
        return this.parseCall(superNode);
      }
      return superNode;
    }

    /* ---------- VARIABLE / INDEX / SLICE / ATTRIBUTE ACCESS ---------- */
    if (t.type === 'IDENTIFIER') {
      const name = t.value;
      this.eat('IDENTIFIER');

      // Handle attribute access: obj.x or obj.x.y
      let node = null;
      if (this.current()?.type === '.') {
        // Attribute access chain
        node = this.parseAttributeChain(new AST.VarNode(name));
      } else if (this.current()?.type === '[') {
        // Index or slice
        this.eat('[');
        let start = null;
        let end = null;
        let step = null;

        if (this.current()?.type !== ':' && this.current()?.type !== ']') {
          start = this.expression();
        }

        if (this.current()?.type === ':') {
          this.eat(':');
          if (this.current()?.type !== ':' && this.current()?.type !== ']') {
            end = this.expression();
          }
          
          if (this.current()?.type === ':') {
            this.eat(':');
            if (this.current()?.type !== ']') {
              step = this.expression();
            }
          }
          
          this.eat(']');
          node = new AST.SliceNode(new AST.VarNode(name), start, end, step);
        } else {
          this.eat(']');
          node = new AST.IndexNode(new AST.VarNode(name), start);
        }
        
        // After index/slice, check for attribute access
        if (this.current()?.type === '.') {
          node = this.parseAttributeChain(node);
        }
      } else {
        node = new AST.VarNode(name);
      }

      // Handle function/method calls after attribute access
      if (this.current()?.type === '(') {
        return this.parseCall(node);
      }

      return node;
    }

    throw new Error(`Unexpected token ${t.type}`);
  }

  /* ---------- ATTRIBUTE ACCESS CHAIN (v2.0) ---------- */
  parseAttributeChain(obj) {
    let node = obj;
    while (this.current()?.type === '.') {
      this.eat('.');
      const attr = this.eat('IDENTIFIER').value;
      node = new AST.AttrNode(node, attr);
    }
    return node;
  }

  /* ---------- FUNCTION/METHOD CALL (v2.0) ---------- */
  parseCall(callee) {
    // callee can be VarNode (function name), AttrNode (obj.method), or SuperNode
    this.eat('(');
    const args = [];
    const kwargs = {};

    if (this.current()?.type !== ')') {
      while (true) {
        if (
          this.current().type === 'IDENTIFIER' &&
          this.peek()?.type === '='
        ) {
          const key = this.eat('IDENTIFIER').value;
          this.eat('=');
          kwargs[key] = this.expression();
        } else {
          args.push(this.expression());
        }

        if (this.current()?.type !== ',') break;
        this.eat(',');
      }
    }
    this.eat(')');

    // Handle special case: list.append() and list.pop() for backward compatibility
    if (callee.type === 'Attr' && callee.obj.type === 'Var') {
      const methodName = `${callee.obj.name}.${callee.attr}`;
      if (methodName.endsWith('.append') || methodName.endsWith('.pop')) {
        return new AST.CallNode(methodName, { args, kwargs });
      }
    }

    // General call: can be function call or method call
    return new AST.CallNode(callee, { args, kwargs });
  }

  term() {
    let node = this.factor();
    while (['*', '/', '%', '//'].includes(this.current()?.type)) {
      const op = this.current().type;
      this.eat(op);
      node = new AST.BinOpNode(node, op, this.factor());
    }
    return node;
  }

  additive() {
    let node = this.term();
    while (['+', '-'].includes(this.current()?.type)) {
      const op = this.current().type;
      this.eat(op);
      node = new AST.BinOpNode(node, op, this.term());
    }
    return node;
  }

  comparison() {
  let left = this.additive();

  // collect chained comparisons
  const ops = [];
  const rights = [];

  while (['==', '!=', '<', '>', '<=', '>='].includes(this.current()?.type)) {
    const op = this.current().type;
    this.eat(op);
    ops.push(op);
    rights.push(this.additive());
  }

  // no chain → normal comparison
  if (ops.length === 0) {
    return left;
  }

  // single comparison
  if (ops.length === 1) {
    return new AST.BinOpNode(left, ops[0], rights[0]);
  }

  // chained comparison: (a < b) and (b < c) and ...
  let expr = new AST.BinOpNode(left, ops[0], rights[0]);

  for (let i = 1; i < ops.length; i++) {
    const rightExpr = new AST.BinOpNode(
      rights[i - 1],
      ops[i],
      rights[i]
    );
    expr = new AST.BinOpNode(expr, 'and', rightExpr);
  }

  return expr;
}

  logicalAnd() {
    let node = this.comparison();
    while (this.current()?.type === 'AND') {
      this.eat('AND');
      node = new AST.BinOpNode(node, 'and', this.comparison());
    }
    return node;
  }

 expression() {
  let node = this.logicalAnd();

  // ternary: <thenExpr> IF <cond> ELSE <elseExpr>
  if (this.current()?.type === 'IF') {
    this.eat('IF');
    const cond = this.expression();
    this.eat('ELSE');
    const elseExpr = this.expression();
    return new AST.TernaryNode(cond, node, elseExpr);
  }

  while (this.current()?.type === 'OR') {
    this.eat('OR');
    node = new AST.BinOpNode(node, 'or', this.logicalAnd());
  }

  return node;
}

logicalOr() {
  let node = this.logicalAnd();
  while (this.current()?.type === 'OR') {
    this.eat('OR');
    node = new AST.BinOpNode(node, 'or', this.logicalAnd());
  }
  return node;
}


  /* ================= STATEMENTS ================= */

  statement() {
    this.skipNewlines();
    const t = this.current();
    if (!t) return null;

    if (t.type === 'DEDENT') {
      // DEDENT token encountered - advance past it and return null
      // The caller (function/class body loop) will check for DEDENT before calling statement()
      // So we should advance here to avoid infinite loops
      this.pos++;
      return null;
    }
    if (t.type === 'INDENT') {
      // Skip unexpected INDENT at top level (shouldn't happen, but handle gracefully)
      // Only skip if we're truly at top level (not in a function)
      // This prevents issues where skipping INDENT causes us to miss function context
      if (!this.inFunction) {
        this.pos++;
        // Don't recursively call statement() - just skip the INDENT and let the next iteration handle it
        // This prevents issues with return statements being encountered before function context is set
        return null;
      } else {
        // If we're in a function and encounter an unexpected INDENT, it's likely an error
        // But for now, skip it to avoid breaking
        this.pos++;
        return null;
      }
    }

    if (t.type === 'PRINT') {
      this.eat('PRINT');
      this.eat('(');
      const e = this.expression();
      
      // Check for keyword argument: end=""
      let endExpr = null;
      if (this.current()?.type === ',') {
        this.eat(',');
        // Check if it's a keyword argument: end=value
        if (this.current()?.type === 'IDENTIFIER' && this.current()?.value === 'end' && this.peek()?.type === '=') {
          this.eat('IDENTIFIER');
          this.eat('=');
          endExpr = this.expression();
        } else {
          throw new Error("print() only supports 'end' keyword argument");
        }
      }
      
      this.eat(')');
      return new AST.PrintNode(e, endExpr);
    }

    if (t.type === 'PRINT_INLINE') {
      this.eat('PRINT_INLINE');
      this.eat('(');
      const e = this.expression();
      this.eat(')');
      return new AST.PrintInlineNode(e);
    }

    if (t.type === 'RETURN') {
      if (!this.inFunction) {
        // Debug: show context around the error
        const context = [];
        for (let i = Math.max(0, this.pos - 5); i < Math.min(this.tokens.length, this.pos + 5); i++) {
          context.push(`${i}: ${this.tokens[i]?.type} ${this.tokens[i]?.value || ''}`);
        }
        throw new Error(`return outside function at position ${this.pos}. Context: ${context.join(', ')}. inFunction=${this.inFunction}`);
      }
      this.eat('RETURN');
      let value = null;
      if (this.current()?.type !== 'NEWLINE' && this.current()?.type !== 'DEDENT') {
        value = this.expression();
      }
      return new AST.ReturnNode(value);
    }

    if (t.type === 'BREAK') {
      this.eat('BREAK');
      return new AST.BreakNode();
    }

    if (t.type === 'CONTINUE') {
      this.eat('CONTINUE');
      return new AST.ContinueNode();
    }

    if (t.type === 'PASS') {
      this.eat('PASS');
      return new AST.PassNode();
    }

    if (t.type === 'WHILE') {
      this.eat('WHILE');
      const condition = this.expression();
      this.eat(':');
      this.eat('NEWLINE');
      this.eat('INDENT');

      const body = [];
      while (true) {
        // Check for DEDENT before calling statement()
        this.skipNewlines();
        if (this.current()?.type === 'DEDENT') {
          break;
        }
        const s = this.statement();
        if (s) {
          body.push(s);
        } else {
          // statement() returned null - it might have encountered and advanced past DEDENT
          // Check if we're now at DEDENT
          if (this.current()?.type === 'DEDENT') {
            break;
          }
          // If still not at DEDENT and statement() returned null, something is wrong
          // But continue to avoid infinite loop
        }
      }
      this.eat('DEDENT');
      
      // Skip any newlines after DEDENT before checking for else clause
      this.skipNewlines();
      
      // Check for else clause
      let elseBody = null;
      if (this.current()?.type === 'ELSE') {
        this.eat('ELSE');
        this.eat(':');
        this.eat('NEWLINE');
        this.eat('INDENT');
        elseBody = [];
        while (true) {
          // Check for DEDENT before calling statement()
          this.skipNewlines();
          if (this.current()?.type === 'DEDENT') {
            break;
          }
          const s = this.statement();
          if (s) {
            elseBody.push(s);
          } else {
            // statement() returned null - it might have encountered and advanced past DEDENT
            // Check if we're now at DEDENT
            if (this.current()?.type === 'DEDENT') {
              break;
            }
          }
        }
        this.eat('DEDENT');
      }
      
      return new AST.WhileNode(condition, body, elseBody);
    }
    if (t.type === 'FOR') {
      this.eat('FOR');
      const varName = this.eat('IDENTIFIER').value;
      this.eat('IN');
      this.eat('RANGE');
      this.eat('(');

      let start, end, step = null;
      const first = this.expression();

      if (this.current()?.type === ')') {
        start = new AST.NumberNode(0);
        end = first;
      } else {
        this.eat(',');
        start = first;
        end = this.expression();
        if (this.current()?.type === ',') {
          this.eat(',');
          step = this.expression();
        }
      }

      this.eat(')');
      this.eat(':');
      this.eat('NEWLINE');
      this.eat('INDENT');

      const body = [];
      while (true) {
        // Check for DEDENT before calling statement()
        this.skipNewlines();
        if (this.current()?.type === 'DEDENT') {
          break;
        }
        const s = this.statement();
        if (s) {
          body.push(s);
        } else {
          // statement() returned null - it might have encountered and advanced past DEDENT
          // Check if we're now at DEDENT
          if (this.current()?.type === 'DEDENT') {
            break;
          }
          // If still not at DEDENT and statement() returned null, something is wrong
          // But continue to avoid infinite loop
        }
      }
      this.eat('DEDENT');

      // Skip any newlines after DEDENT before checking for else clause
      this.skipNewlines();

      // Check for else clause
      let elseBody = null;
      if (this.current()?.type === 'ELSE') {
        this.eat('ELSE');
        this.eat(':');
        this.eat('NEWLINE');
        this.eat('INDENT');
        elseBody = [];
        while (true) {
          // Check for DEDENT before calling statement()
          this.skipNewlines();
          if (this.current()?.type === 'DEDENT') {
            break;
          }
          const s = this.statement();
          if (s) {
            elseBody.push(s);
          } else {
            // statement() returned null - it might have encountered and advanced past DEDENT
            // Check if we're now at DEDENT
            if (this.current()?.type === 'DEDENT') {
              break;
            }
            // If still not at DEDENT and statement() returned null, something is wrong
            // But continue to avoid infinite loop
          }
        }
        this.eat('DEDENT');
      }

      return new AST.ForNode(varName, [start, end, step].filter(x => x !== null), body, elseBody);
    }

    if (t.type === 'DEF') {
      this.eat('DEF');
      const name = this.eat('IDENTIFIER').value;

      this.eat('(');
 const params = [];
let seenDefault = false;

if (this.current()?.type !== ')') {
  while (true) {
    const name = this.eat('IDENTIFIER').value;

    // Parse annotation (optional): name: annotation
    let annotation = null;
    if (this.current()?.type === ':') {
      this.eat(':');
      annotation = this.expression(); // Parse annotation expression
    }

    let defaultValue = null;
    if (this.current()?.type === '=') {
      this.eat('=');
      defaultValue = this.expression();
      seenDefault = true;
    } else if (seenDefault) {
      throw new Error("SyntaxError: non-default argument follows default argument");
    }

    params.push(new AST.ParamNode(name, defaultValue, annotation));

    if (this.current()?.type !== ',') break;
    this.eat(',');
  }
}

      this.eat(')');

      // Parse return annotation (optional): -> annotation
      let returnAnnotation = null;
      if (this.current()?.type === '-') {
        this.eat('-');
        if (this.current()?.type === '>') {
          this.eat('>');
          returnAnnotation = this.expression(); // Parse return annotation
        } else {
          throw new Error("SyntaxError: expected '>' after '-' in return annotation");
        }
      }

      this.eat(':');
      this.eat('NEWLINE');
      this.eat('INDENT');

      const prev = this.inFunction;
      this.inFunction = true;
      // DEBUG: Track that we're entering a function
      // This ensures that nested functions correctly preserve the outer function's inFunction state

      const body = [];
      while (true) {
        // Check for DEDENT before calling statement()
        this.skipNewlines();
        if (!this.current()) {
          break;
        }
        if (this.current().type === 'DEDENT') {
          // This DEDENT ends our function body - break
          break;
        }
        const s = this.statement();
        if (s) {
          body.push(s);
          // CRITICAL FIX: After parsing a nested function, ensure inFunction stays true
          // When we parse a nested function, statement() temporarily sets inFunction=true
          // for the nested function, then restores it to prev when the nested function finishes.
          // But we're still inside the outer function, so inFunction must remain true.
          if (s.type === 'Function') {
            // We just parsed a nested function - ensure we're still marked as being in a function
            // because we're still inside the outer function's body
            this.inFunction = true;
          }
        } else {
          // statement() returned null - it might have advanced past a DEDENT
          // Check if we're now at DEDENT or EOF
          if (!this.current() || this.current().type === 'DEDENT') {
            break;
          }
          // If statement() returned null and we're not at DEDENT/EOF, 
          // it might have consumed something else - continue the loop
        }
      }
      // Eat the DEDENT that ends this function body
      // But be careful: if we just finished parsing a nested function, we might have
      // already consumed a DEDENT. Check if we're at DEDENT before eating.
      // IMPORTANT: We need to preserve inFunction=true while we're still parsing
      // the outer function's body, so we restore it AFTER eating the DEDENT
      if (this.current()?.type === 'DEDENT') {
        this.eat('DEDENT');
      }
      // CRITICAL BUG FIX: Restore inFunction to prev AFTER eating DEDENT
      // The bug was that when we finish parsing a nested function, we restore inFunction=prev,
      // but prev was captured when we STARTED parsing this function. If we're inside an outer
      // function, prev should be true, so we restore it correctly. But we MUST ensure that
      // after restoring, if we're still inside an outer function (prev was true), inFunction
      // remains true. The issue was that prev was somehow undefined or false.
      // FIX: Ensure prev is always a boolean, and if it was true (we're in a nested function),
      // ensure inFunction stays true
      this.inFunction = (prev === true || prev === false) ? prev : false;
      
      // ADDITIONAL SAFETY: If we just finished parsing a nested function and we're still
      // inside an outer function, ensure inFunction is true. This handles edge cases where
      // prev might not be set correctly.
      // Note: We can't check if we're still in a function here because we've already
      // restored inFunction. But the fix above should handle it.

      return new AST.FunctionNode(name, params, body, returnAnnotation);
    }

    /* ---------- CLASS DEFINITION (v2.0) ---------- */
    if (t.type === 'CLASS') {
      this.eat('CLASS');
      const name = this.eat('IDENTIFIER').value;
      
      // Parse base class (single inheritance): class Child(Parent):
      let baseClass = null;
      if (this.current()?.type === '(') {
        this.eat('(');
        if (this.current()?.type !== ')') {
          baseClass = this.expression(); // Parse base class name
        }
        this.eat(')');
      }
      
      this.eat(':');
      this.eat('NEWLINE');
      this.eat('INDENT');
      
      const methods = [];
      while (true) {
        // Check for DEDENT before calling statement()
        this.skipNewlines();
        if (this.current()?.type === 'DEDENT') {
          break;
        }
        const s = this.statement();
        if (s && s.type === 'Function') {
          methods.push(s);
        } else if (s) {
          // Allow pass statements and other statements in class body
          // (though typically only methods are allowed)
        } else {
          // statement() returned null - it might have encountered and advanced past DEDENT
          // Check if we're now at DEDENT
          if (this.current()?.type === 'DEDENT') {
            break;
          }
        }
      }
      this.eat('DEDENT');
      
      return new AST.ClassNode(name, baseClass, methods);
    }

    /* ---------- TRY / EXCEPT / FINALLY ---------- */
    if (t.type === 'TRY') {
      this.eat('TRY');
      this.eat(':');
      this.eat('NEWLINE');
      this.eat('INDENT');
      const tryBody = [];
      while (true) {
        // Check for DEDENT, EXCEPT, or FINALLY before calling statement()
        this.skipNewlines();
        if (this.current()?.type === 'DEDENT' || this.current()?.type === 'EXCEPT' || this.current()?.type === 'FINALLY') {
          break;
        }
        const s = this.statement();
        if (s) {
          tryBody.push(s);
        } else {
          // statement() returned null - check if we're now at DEDENT/EXCEPT/FINALLY
          if (this.current()?.type === 'DEDENT' || this.current()?.type === 'EXCEPT' || this.current()?.type === 'FINALLY') {
            break;
          }
        }
      }
      this.eat('DEDENT');
      
      const exceptClauses = [];
      while (this.current()?.type === 'EXCEPT') {
        this.eat('EXCEPT');
        let exception = null;
        let name = null;
        
        if (this.current()?.type !== ':') {
          exception = this.expression();
          if (this.current()?.type === 'AS') {
            this.eat('AS');
            name = this.eat('IDENTIFIER').value;
          }
        }
        
        this.eat(':');
        this.eat('NEWLINE');
        this.eat('INDENT');
        const exceptBody = [];
        while (true) {
          // Check for DEDENT, EXCEPT, or FINALLY before calling statement()
          this.skipNewlines();
          if (this.current()?.type === 'DEDENT' || this.current()?.type === 'EXCEPT' || this.current()?.type === 'FINALLY') {
            break;
          }
          const s = this.statement();
          if (s) {
            exceptBody.push(s);
          } else {
            // statement() returned null - check if we're now at DEDENT/EXCEPT/FINALLY
            if (this.current()?.type === 'DEDENT' || this.current()?.type === 'EXCEPT' || this.current()?.type === 'FINALLY') {
              break;
            }
          }
        }
        this.eat('DEDENT');
        
        exceptClauses.push({ exception, name, body: exceptBody });
      }
      
      let finallyBody = null;
      if (this.current()?.type === 'FINALLY') {
        this.eat('FINALLY');
        this.eat(':');
        this.eat('NEWLINE');
        this.eat('INDENT');
        finallyBody = [];
        while (true) {
          // Check for DEDENT before calling statement()
          this.skipNewlines();
          if (this.current()?.type === 'DEDENT') {
            break;
          }
          const s = this.statement();
          if (s) {
            finallyBody.push(s);
          } else {
            // statement() returned null - it might have encountered and advanced past DEDENT
            // Check if we're now at DEDENT
            if (this.current()?.type === 'DEDENT') {
              break;
            }
          }
        }
        this.eat('DEDENT');
      }
      
      return new AST.TryNode(tryBody, exceptClauses, finallyBody);
    }

    /* ---------- RAISE ---------- */
    if (t.type === 'RAISE') {
      this.eat('RAISE');
      let expr = null;
      if (this.current()?.type !== 'NEWLINE' && this.current()?.type !== 'DEDENT') {
        expr = this.expression();
      }
      return new AST.RaiseNode(expr);
    }

    /* ---------- ASSERT ---------- */
    if (t.type === 'ASSERT') {
      this.eat('ASSERT');
      const condition = this.expression();
      let message = null;
      if (this.current()?.type === ',') {
        this.eat(',');
        message = this.expression();
      }
      return new AST.AssertNode(condition, message);
    }

    /* ---------- IF / ELIF / ELSE ---------- */
    if (t.type === 'IF') {
      return this.parseIfChain();
    }
    if (t.type === 'GLOBAL') {
  this.eat('GLOBAL');

  const names = [];
  names.push(this.eat('IDENTIFIER').value);

  while (this.current()?.type === ',') {
    this.eat(',');
    names.push(this.eat('IDENTIFIER').value);
  }

  return new AST.GlobalNode(names);
}

if (t.type === 'NONLOCAL') {
  this.eat('NONLOCAL');

  const names = [];
  names.push(this.eat('IDENTIFIER').value);

  while (this.current()?.type === ',') {
    this.eat(',');
    names.push(this.eat('IDENTIFIER').value);
  }

  return new AST.NonlocalNode(names);
}

   if (t.type === 'IDENTIFIER') {
    // ---------- INDEX / SLICE ASSIGNMENT ----------
if (this.peek()?.type === '[') {
  const name = t.value;
  this.eat('IDENTIFIER');
  this.eat('[');
  
  let start = null;
  let end = null;
  let step = null;
  
  // Check if it's a slice (has ':') or index
  if (this.current()?.type !== ':' && this.current()?.type !== ']') {
    start = this.expression();
  }
  
  if (this.current()?.type === ':') {
    // It's a slice assignment
    this.eat(':');
    if (this.current()?.type !== ':' && this.current()?.type !== ']') {
      end = this.expression();
    }
    
    // Check for step
    if (this.current()?.type === ':') {
      this.eat(':');
      if (this.current()?.type !== ']') {
        step = this.expression();
      }
    }
    
    this.eat(']');
    this.eat('=');
    const value = this.expression();
    return new AST.AssignSliceNode(
      new AST.VarNode(name),
      start,
      end,
      step,
      value
    );
  } else {
    // It's an index assignment
    this.eat(']');
    this.eat('=');
    const value = this.expression();
    return new AST.AssignIndexNode(
      new AST.VarNode(name),
      start,
      value
    );
  }
}


  // assignment
  if (this.peek()?.type === '=') {
    const name = t.value;
    this.eat('IDENTIFIER');
    this.eat('=');
    return new AST.AssignNode(name, this.expression());
  }

  // attribute assignment: obj.x = value (v2.0)
  if (this.peek()?.type === '.') {
    // Parse attribute chain and check for assignment
    const obj = new AST.VarNode(t.value);
    this.eat('IDENTIFIER');
    let attrNode = this.parseAttributeChain(obj);
    
    // Check if it's an assignment
    if (this.current()?.type === '=') {
      this.eat('=');
      const value = this.expression();
      if (attrNode.type === 'Attr') {
        return new AST.AttrAssignNode(attrNode.obj, attrNode.attr, value);
      }
      throw new Error('Invalid attribute assignment');
    }
    
    // Otherwise it's an expression statement (attribute access or method call)
    if (this.current()?.type === '(') {
      return new AST.ExprStmtNode(this.parseCall(attrNode));
    }
    return new AST.ExprStmtNode(attrNode);
  }

  // function call / method call → expression statement
  if (this.peek()?.type === '(') {
    return new AST.ExprStmtNode(this.expression());
  }

  // 🔥 EXPRESSION STATEMENT (NEW)
return new AST.ExprStmtNode(this.expression());

}

    throw new Error(`Unknown statement ${t.type}`);
  }

  /* ======== NEW FUNCTION (ADDED, NOTHING REMOVED) ======== */
parseIfChain() {
  // accept IF or ELIF
  if (this.current().type === 'IF') {
    this.eat('IF');
  } else if (this.current().type === 'ELIF') {
    this.eat('ELIF');
  } else {
    throw new Error(`Expected IF or ELIF, got ${this.current()?.type}`);
  }

  const condition = this.expression();

  this.eat(':');
  this.eat('NEWLINE');
  this.eat('INDENT');

  const thenBody = [];
  while (true) {
    // Check for DEDENT before calling statement()
    this.skipNewlines();
    if (this.current()?.type === 'DEDENT') {
      break;
    }
    const s = this.statement();
    if (s) {
      thenBody.push(s);
    } else {
      // statement() returned null - it might have encountered and advanced past DEDENT
      // Check if we're now at DEDENT
      if (this.current()?.type === 'DEDENT') {
        break;
      }
      // If still not at DEDENT and statement() returned null, something is wrong
      // But continue to avoid infinite loop
    }
  }
  this.eat('DEDENT');
  
  // Skip any newlines after DEDENT before checking for ELIF/ELSE
  this.skipNewlines();

  let elseBody = null;

  // chain elif
  if (this.current()?.type === 'ELIF') {
    elseBody = [this.parseIfChain()];
  }
  // final else
  else if (this.current()?.type === 'ELSE') {
    this.eat('ELSE');
    this.eat(':');
    this.eat('NEWLINE');
    this.eat('INDENT');

    elseBody = [];
    while (true) {
      // Check for DEDENT before calling statement()
      this.skipNewlines();
      if (this.current()?.type === 'DEDENT') {
        break;
      }
      const s = this.statement();
      if (s) {
        elseBody.push(s);
      } else {
        // statement() returned null - it might have encountered and advanced past DEDENT
        // Check if we're now at DEDENT
        if (this.current()?.type === 'DEDENT') {
          break;
        }
        // If still not at DEDENT and statement() returned null, something is wrong
        // But continue to avoid infinite loop
      }
    }
    this.eat('DEDENT');
  }

  return new AST.IfNode(condition, thenBody, elseBody);
}


  parse() {
    const stmts = [];
    while (this.pos < this.tokens.length) {
      this.skipNewlines();
      const s = this.statement();
      if (s) stmts.push(s);
    }
    return stmts;
  }
}

module.exports = Parser;
