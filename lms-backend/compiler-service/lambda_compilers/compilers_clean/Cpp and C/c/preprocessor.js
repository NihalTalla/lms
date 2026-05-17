// c/preprocessor.js
// C preprocessor implementation for competitive programming grade compiler
// Supports: #include, #define, #if/#ifdef/#ifndef/#elif/#else/#endif, defined(), line continuation

const fs = require("fs");
const path = require("path");

class Preprocessor {
  constructor(source, baseDir = null) {
    this.source = source;
    this.baseDir = baseDir || process.cwd();
    this.macros = new Map();
    this.includePaths = [this.baseDir];
    // Add stdlib directory to include paths
    const stdlibPath = path.join(__dirname, "stdlib");
    this.includePaths.push(stdlibPath);
    this.processed = [];
    this.line = 1;
    this.column = 1;
    this.pos = 0;
    this.length = source.length;
    
    // Track include guards
    this.includedFiles = new Set();
    
    // Initialize standard macros
    this.macros.set("__LINE__", { kind: "object", value: () => this.line });
    this.macros.set("__FILE__", { kind: "object", value: () => '"' + (this.currentFile || "<stdin>") + '"' });
  }

  eof() {
    return this.pos >= this.length;
  }

  peek(n = 0) {
    return this.pos + n < this.length ? this.source[this.pos + n] : "\0";
  }

  advance() {
    const ch = this.source[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  skipWhitespace() {
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === " " || ch === "\t" || ch === "\r") {
        this.advance();
      } else if (ch === "\n") {
        this.advance();
        return true; // newline found
      } else {
        break;
      }
    }
    return false;
  }

  skipLine() {
    while (!this.eof() && this.peek() !== "\n") {
      this.advance();
    }
    if (!this.eof()) this.advance(); // consume newline
  }

  readIdentifier() {
    let text = "";
    while (!this.eof()) {
      const ch = this.peek();
      if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || (ch >= "0" && ch <= "9") || ch === "_") {
        text += this.advance();
      } else {
        break;
      }
    }
    return text;
  }

  readString() {
    const quote = this.advance(); // consume opening quote
    let value = quote;
    while (!this.eof() && this.peek() !== quote) {
      if (this.peek() === "\\") {
        value += this.advance();
        value += this.advance();
      } else {
        value += this.advance();
      }
    }
    if (!this.eof()) {
      value += this.advance(); // consume closing quote
    }
    return value;
  }

  // Handle line continuation with backslash-newline
  handleLineContinuation() {
    if (this.peek() === "\\" && this.peek(1) === "\n") {
      this.advance(); // consume backslash
      this.advance(); // consume newline
      return true;
    }
    if (this.peek() === "\\" && this.peek(1) === "\r" && this.peek(2) === "\n") {
      this.advance(); // consume backslash
      this.advance(); // consume \r
      this.advance(); // consume \n
      return true;
    }
    return false;
  }

  // Process #include directive
  processInclude() {
    this.skipWhitespace();
    
    let filename = "";
    if (this.peek() === '"') {
      // Local include: #include "file.h"
      const str = this.readString();
      filename = str.slice(1, -1); // remove quotes
      const includePath = path.join(this.baseDir, filename);
      if (fs.existsSync(includePath)) {
        return this.includeFile(includePath);
      }
    } else if (this.peek() === "<") {
      // System include: #include <file.h>
      this.advance(); // consume <
      while (!this.eof() && this.peek() !== ">") {
        filename += this.advance();
      }
      if (!this.eof()) this.advance(); // consume >
      
      // Try include paths
      for (const includePath of this.includePaths) {
        const fullPath = path.join(includePath, filename);
        if (fs.existsSync(fullPath)) {
          return this.includeFile(fullPath);
        }
      }
      // If not found, just skip (don't error for now)
      return "";
    }
    
    this.skipLine();
    return "";
  }

  includeFile(filePath) {
    const absPath = path.resolve(filePath);
    
    // Simple include guard: skip if already included
    if (this.includedFiles.has(absPath)) {
      this.skipLine();
      return "";
    }
    
    this.includedFiles.add(absPath);
    
    try {
      const content = fs.readFileSync(absPath, "utf8");
      const savedBaseDir = this.baseDir;
      const savedLine = this.line;
      const savedColumn = this.column;
      const savedPos = this.pos;
      const savedSource = this.source;
      const savedLength = this.length;
      
      this.baseDir = path.dirname(absPath);
      this.currentFile = absPath;
      
      // Process the included file
      const included = new Preprocessor(content, this.baseDir);
      included.macros = this.macros; // share macros
      included.includePaths = this.includePaths;
      included.includedFiles = this.includedFiles;
      included.currentFile = absPath;
      const processed = included.process();
      
      // Restore state
      this.baseDir = savedBaseDir;
      this.line = savedLine;
      this.column = savedColumn;
      this.pos = savedPos;
      this.source = savedSource;
      this.length = savedLength;
      this.currentFile = savedBaseDir ? path.basename(savedBaseDir) : null;
      
      return processed;
    } catch (err) {
      // If file not found, just skip
      this.skipLine();
      return "";
    }
  }

  // Process #define directive
  processDefine() {
    this.skipWhitespace();
    const name = this.readIdentifier();
    if (!name) {
      this.skipLine();
      return;
    }

    // Check for function-like macro: MACRO(...)
    if (this.peek() === "(") {
      this.advance(); // consume (
      const params = [];
      if (this.peek() !== ")") {
        while (true) {
          this.skipWhitespace();
          const param = this.readIdentifier();
          if (param) params.push(param);
          if (this.peek() === ",") {
            this.advance();
            continue;
          }
          if (this.peek() === ")") break;
        }
      }
      this.advance(); // consume )
      
      // Read replacement text (until end of line, handling line continuation)
      let replacement = "";
      while (!this.eof()) {
        if (this.handleLineContinuation()) {
          continue;
        }
        if (this.peek() === "\n") break;
        replacement += this.advance();
      }
      
      this.macros.set(name, { kind: "function", params, replacement: replacement.trim() });
    } else {
      // Object-like macro
      let replacement = "";
      while (!this.eof()) {
        if (this.handleLineContinuation()) {
          continue;
        }
        if (this.peek() === "\n") break;
        replacement += this.advance();
      }
      
      this.macros.set(name, { kind: "object", replacement: replacement.trim() });
    }
  }

  // Process #if, #ifdef, #ifndef, #elif, #else, #endif
  processConditional() {
    const directive = this.readIdentifier().toUpperCase();
    
    if (directive === "IF" || directive === "IFDEF" || directive === "IFNDEF") {
      return this.processIf(directive);
    } else if (directive === "ELIF") {
      return this.processElif();
    } else if (directive === "ELSE") {
      return this.processElse();
    } else if (directive === "ENDIF") {
      return this.processEndif();
    } else if (directive === "PRAGMA") {
      // #pragma once - simple include guard
      this.skipWhitespace();
      const pragma = this.readIdentifier().toUpperCase();
      if (pragma === "ONCE") {
        // Already handled by includedFiles set
      }
      this.skipLine();
      return { kind: "pragma" };
    }
    
    this.skipLine();
    return null;
  }

  processIf(directive) {
    let condition = false;
    
    if (directive === "IFDEF") {
      this.skipWhitespace();
      const name = this.readIdentifier();
      condition = this.macros.has(name);
    } else if (directive === "IFNDEF") {
      this.skipWhitespace();
      const name = this.readIdentifier();
      condition = !this.macros.has(name);
    } else {
      // #if - evaluate expression
      this.skipWhitespace();
      condition = this.evaluateCondition();
    }
    
    this.skipLine();
    return { kind: "if", condition, depth: 1 };
  }

  evaluateCondition() {
    // Simple condition evaluator - supports defined(X), integer literals, &&, ||, !
    let result = this.evaluateConditionExpr();
    return result !== 0;
  }

  evaluateConditionExpr() {
    this.skipWhitespace();
    
    // Check for !
    if (this.peek() === "!") {
      this.advance();
      this.skipWhitespace();
      const val = this.evaluateConditionExpr();
      return val === 0 ? 1 : 0;
    }
    
    // Check for number
    if (this.peek() >= "0" && this.peek() <= "9") {
      let num = "";
      while (this.peek() >= "0" && this.peek() <= "9") {
        num += this.advance();
      }
      return parseInt(num, 10);
    }
    
    // Check for defined(X)
    const id = this.readIdentifier();
    if (id === "defined") {
      this.skipWhitespace();
      let name;
      if (this.peek() === "(") {
        this.advance();
        this.skipWhitespace();
        name = this.readIdentifier();
        this.skipWhitespace();
        if (this.peek() === ")") this.advance();
      } else {
        // defined without parens - read next identifier as name
        name = this.readIdentifier();
      }
      return this.macros.has(name) ? 1 : 0;
    }
    
    // Not "defined", so use the identifier we just read as a macro name
    if (id) {
      const macro = this.macros.get(id);
      if (macro && macro.kind === "object") {
        // Try to parse replacement as number
        const val = parseInt(macro.replacement, 10);
        return isNaN(val) ? (macro.replacement ? 1 : 0) : val;
      }
      return this.macros.has(id) ? 1 : 0;
    }
    
    return 0;
  }

  match(str) {
    if (this.pos + str.length > this.length) return false;
    for (let i = 0; i < str.length; i++) {
      if (this.peek(i) !== str[i]) return false;
    }
    return true;
  }

  processElif() {
    this.skipWhitespace();
    const condition = this.evaluateCondition();
    this.skipLine();
    return { kind: "elif", condition };
  }

  processElse() {
    this.skipLine();
    return { kind: "else" };
  }

  processEndif() {
    this.skipLine();
    return { kind: "endif" };
  }

  // Parse macro arguments: MACRO(arg1, arg2, ...)
  parseMacroArguments() {
    const args = [];
    let depth = 1; // track parentheses depth
    
    if (this.peek() === ")") {
      this.advance(); // consume )
      return args;
    }
    
    let currentArg = "";
    while (depth > 0 && !this.eof()) {
      const ch = this.advance();
      if (ch === "(") {
        depth++;
        if (depth > 1) currentArg += ch;
      } else if (ch === ")") {
        depth--;
        if (depth > 0) currentArg += ch;
        else break;
      } else if (ch === "," && depth === 1) {
        args.push(currentArg.trim());
        currentArg = "";
      } else {
        currentArg += ch;
      }
    }
    
    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }
    
    return args;
  }

  // Expand function-like macro with arguments
  expandFunctionMacro(macro, args) {
    if (args.length !== macro.params.length) {
      // Mismatch - return original macro name (simplified)
      return macro.params.join(",");
    }
    
    let replacement = macro.replacement;
    
    // Simple parameter substitution
    for (let i = 0; i < macro.params.length; i++) {
      const paramName = macro.params[i];
      const argValue = args[i];
      // Replace parameter with argument value
      const regex = new RegExp(`\\b${paramName}\\b`, "g");
      replacement = replacement.replace(regex, argValue);
    }
    
    // Recursively expand macros in the replacement text
    // Create a temporary preprocessor to expand nested macros
    const tempPP = new Preprocessor(replacement, this.baseDir);
    tempPP.macros = this.macros; // Share macros
    tempPP.includePaths = this.includePaths;
    tempPP.includedFiles = this.includedFiles;
    replacement = tempPP.process();
    
    return replacement;
  }

  // Expand macros in text
  expandMacros(text) {
    // Simple expansion: replace macro names with their values
    let result = text;
    for (const [name, macro] of this.macros.entries()) {
      if (macro.kind === "object") {
        // Simple string replacement (not perfect but good enough for CP)
        const regex = new RegExp(`\\b${name}\\b`, "g");
        let replacement = macro.replacement;
        if (typeof replacement === "function") {
          replacement = replacement();
        }
        result = result.replace(regex, replacement);
      }
    }
    return result;
  }

  // Main preprocessing function
  process() {
    const output = [];
    const conditionalStack = [];
    let skipping = false;
    let skipDepth = 0;

    while (!this.eof()) {
      // Handle line continuation
      if (this.handleLineContinuation()) {
        continue;
      }

      // Check for preprocessor directive
      if (this.peek() === "#") {
        const hashPos = this.pos;
        this.advance(); // consume #
        
        // Skip whitespace after #
        this.skipWhitespace();
        
        const directive = this.readIdentifier().toUpperCase();
        
        if (directive === "INCLUDE") {
          if (!skipping) {
            const included = this.processInclude();
            output.push(included);
          } else {
            this.skipLine();
          }
          continue;
        } else if (directive === "DEFINE") {
          if (!skipping) {
            this.processDefine();
          } else {
            this.skipLine();
          }
          continue;
        } else if (directive === "IF" || directive === "IFDEF" || directive === "IFNDEF") {
          const result = this.processIf(directive);
          if (result) {
            conditionalStack.push({ kind: result.kind, condition: result.condition, depth: result.depth });
            if (!result.condition) {
              skipping = true;
              skipDepth = result.depth;
            }
          }
          continue;
        } else if (directive === "ELIF") {
          if (conditionalStack.length === 0) {
            throw new Error(`#elif without matching #if at line ${this.line}`);
          }
          const top = conditionalStack[conditionalStack.length - 1];
          if (top.kind === "else") {
            throw new Error(`#elif after #else at line ${this.line}`);
          }
          
          if (skipDepth === top.depth) {
            // We're in the skipped block, check if we should enable
            const result = this.processElif();
            if (result && result.condition) {
              skipping = false;
              skipDepth = 0;
              top.kind = "elif";
              top.condition = true;
            }
          } else {
            this.skipLine();
          }
          continue;
        } else if (directive === "ELSE") {
          if (conditionalStack.length === 0) {
            throw new Error(`#else without matching #if at line ${this.line}`);
          }
          const top = conditionalStack[conditionalStack.length - 1];
          if (top.kind === "else") {
            throw new Error(`#else after #else at line ${this.line}`);
          }
          
          if (skipDepth === top.depth) {
            skipping = false;
            skipDepth = 0;
            top.kind = "else";
          } else {
            this.skipLine();
          }
          continue;
        } else if (directive === "ENDIF") {
          if (conditionalStack.length === 0) {
            throw new Error(`#endif without matching #if at line ${this.line}`);
          }
          conditionalStack.pop();
          if (skipDepth > 0) {
            skipDepth--;
            if (skipDepth === 0) {
              skipping = false;
            }
          }
          this.skipLine();
          continue;
        } else if (directive === "PRAGMA") {
          this.processConditional();
          continue;
        } else {
          // Unknown directive - skip it
          this.skipLine();
          continue;
        }
      }

      // Regular source code - expand macros as we go
      if (!skipping) {
        const ch = this.peek();
        
        // Check if we're at an identifier that might be a macro
        if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
          const savedPos = this.pos;
          const savedLine = this.line;
          const savedCol = this.column;
          
          // Try to read an identifier
          const id = this.readIdentifier();
          if (id && this.macros.has(id)) {
            const macro = this.macros.get(id);
            
            if (macro.kind === "object") {
              // Object-like macro: replace with replacement text
              let replacement = macro.replacement;
              if (typeof replacement === "function") {
                replacement = replacement();
              }
              output.push(replacement);
              continue;
            } else if (macro.kind === "function") {
              // Function-like macro: check if followed by (
              this.skipWhitespace();
              if (this.peek() === "(") {
                this.advance(); // consume (
                const args = this.parseMacroArguments();
                // Expand macro with arguments
                const expanded = this.expandFunctionMacro(macro, args);
                output.push(expanded);
                continue;
              } else {
                // Not a macro call, restore position and output identifier
                this.pos = savedPos;
                this.line = savedLine;
                this.column = savedCol;
                // Output identifier character by character
                for (let i = 0; i < id.length; i++) {
                  output.push(this.advance());
                }
                continue;
              }
            }
          } else {
            // Not a macro, restore position
            this.pos = savedPos;
            this.line = savedLine;
            this.column = savedCol;
          }
        }
        
        // Output character normally
        output.push(this.advance());
      } else {
        this.skipLine();
      }
    }

    if (conditionalStack.length > 0) {
      throw new Error(`Unclosed #if at end of file`);
    }

    return output.join("");
  }
}

function preprocess(source, baseDir = null) {
  const pp = new Preprocessor(source, baseDir);
  return pp.process();
}

module.exports = { Preprocessor, preprocess };
