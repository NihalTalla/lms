const Env = require('./env');
const readline = require('readline-sync');
const {
  RuntimeError,
  TypeErrorR,
  IndexErrorR,
  ZeroDivisionErrorR
} = require('../runtime/errors');

class VirtualMachine {
  constructor(bytecode, options = {}) {
    this.bytecode = bytecode;
    this.stack = [];
    this.frames = [];
    this.ip = 0;
    this.steps = 0;
    this.MAX_STEPS = Number.isFinite(options.maxSteps) ? options.maxSteps : 100000;
    this.MAX_TIME_MS = Number.isFinite(options.maxTimeMs) ? options.maxTimeMs : null;
    this._startTimeMs = Date.now();

    // Basic memory guards (approximate)
    this.MAX_STACK = Number.isFinite(options.maxStack) ? options.maxStack : 20000;
    this.MAX_FRAMES = Number.isFinite(options.maxFrames) ? options.maxFrames : 2000;
    this.MAX_HEAP_CELLS = Number.isFinite(options.maxHeapCells) ? options.maxHeapCells : 2_000_000;
    this._heapCells = 0;

    // Deterministic stdin (for judging). If not provided, fall back to readline-sync.
    const stdin = typeof options.stdin === 'string' ? options.stdin : null;
    this._inputLines = stdin !== null ? stdin.split(/\r?\n/) : null;
    this._inputIndex = 0;

    // global frame
    this.frames.push({
      returnIp: null,
      env: new Env(null)  // global env has no parent
    });
  }

  _checkLimits() {
    if (this.MAX_TIME_MS !== null && (Date.now() - this._startTimeMs) > this.MAX_TIME_MS) {
      throw new RuntimeError("TimeoutError", `time limit exceeded (${this.MAX_TIME_MS} ms)`);
    }
    if (this.stack.length > this.MAX_STACK) {
      throw new RuntimeError("MemoryError", `stack limit exceeded (${this.MAX_STACK})`);
    }
    if (this.frames.length > this.MAX_FRAMES) {
      throw new RuntimeError("RecursionError", `call stack limit exceeded (${this.MAX_FRAMES})`);
    }
    if (this._heapCells > this.MAX_HEAP_CELLS) {
      throw new RuntimeError("MemoryError", `memory limit exceeded (${this.MAX_HEAP_CELLS} cells)`);
    }
  }

  _readInputLine() {
    if (this._inputLines) {
      // Python's input() returns '' on EOF; this is close enough for judging.
      if (this._inputIndex >= this._inputLines.length) return '';
      return this._inputLines[this._inputIndex++];
    }
    return readline.question('');
  }

  currentFrame() {
    return this.frames[this.frames.length - 1];
  }

  run() {
    const pop = () => {
      if (this.stack.length === 0)
        throw new RuntimeError("RuntimeError", "stack underflow");
      return this.stack.pop();
    };

    let currentException = null; // Current exception being handled
    const exceptionStack = []; // Stack of try blocks: [{ tryStart, tryEnd, exceptHandlers, finallyStart, endLabel }]
    let pendingException = null; // rethrow after finally
    let pendingExceptionAt = null;

    const handleException = (e, throwingIp) => {
      if (!(e instanceof RuntimeError)) {
        return false; // Can't handle non-RuntimeError
      }
      
      const exceptionMessage = e.message || String(e);
      const currentEnv = this.currentFrame().env;
      
      // Search from innermost to outermost
      for (let i = exceptionStack.length - 1; i >= 0; i--) {
        const tryBlock = exceptionStack[i];
        
        // Check if we're within the try block range
        // tryStart is the bytecode index of the first instruction of try body (after TRY instruction)
        // tryEnd is the bytecode index after the last instruction of try body
        // Note: throwingIp is the IP of the instruction that threw the exception
        // The TRY instruction itself is at tryStart - 1, so we check if throwingIp is in [tryStart, tryEnd)
        if (throwingIp >= tryBlock.tryStart && throwingIp < tryBlock.tryEnd) {
          // Try to match an except handler
          for (const handler of tryBlock.exceptHandlers) {
            // If no exception type specified, catch all
            if (handler.exception === null || handler.exception === undefined) {
              // Match - execute this handler
              // We are now outside this try; it must not catch again.
              exceptionStack.splice(i);
              if (handler.name) {
                currentEnv.set(handler.name, exceptionMessage);
              }
              this.ip = handler.handlerStart;
              return true; // Handled
            } else {
              // For now, simple string matching
              const exceptionType = e.type || 'RuntimeError';
              if (typeof handler.exception === 'string' && 
                  (exceptionMessage === handler.exception || exceptionType === handler.exception)) {
                exceptionStack.splice(i);
                if (handler.name) {
                  currentEnv.set(handler.name, exceptionMessage);
                }
                this.ip = handler.handlerStart;
                return true; // Handled
              }
            }
          }
          
          // If no handler matched but there's a finally, execute it
          if (tryBlock.finallyStart !== null) {
            // Execute finally, then rethrow at endLabel so outer try blocks can catch it.
            pendingException = e;
            pendingExceptionAt = tryBlock.endLabel;
            exceptionStack.splice(i);
            this.ip = tryBlock.finallyStart;
            return true; // handled for now (will rethrow after finally)
          }
        }
      }
      
      return false; // Not handled
    };

    let shouldContinue = true;
    while (shouldContinue) {
      try {
        while (this.ip < this.bytecode.length) {
        if (++this.steps > this.MAX_STEPS)
          throw new RuntimeError("RuntimeError", "execution limit exceeded");
        // Check wall-clock + memory limits periodically (cheap cadence).
        if ((this.steps & 0xff) === 0) this._checkLimits();

        // If we finished a finally that must rethrow, do it before executing endLabel.
        if (pendingException && pendingExceptionAt !== null && this.ip === pendingExceptionAt) {
          const e = pendingException;
          pendingException = null;
          pendingExceptionAt = null;
          throw e;
        }

        // Unwind completed try blocks.
        while (exceptionStack.length > 0) {
          const top = exceptionStack[exceptionStack.length - 1];
          if (this.ip >= top.endLabel) {
            exceptionStack.pop();
            continue;
          }
          break;
        }

        const [op, a, b, c] = this.bytecode[this.ip];
        const env = this.currentFrame().env;

        switch (op) {

          /* ---------- CONSTANTS ---------- */
         case 'LOAD_CONST':
  if (a && a.__type === 'function') {
    this.stack.push({
      ...a,
      env: this.currentFrame().env   // 🔥 CAPTURE ENV HERE
    });
  } else {
    this.stack.push(a);
  }
  break;

          /* ---------- VARIABLES ---------- */
          case 'LOAD_VAR':
            this.stack.push(env.get(a));
            break;

          case 'STORE_VAR':
            env.set(a, pop());
            break;
          case 'STORE_GLOBAL':
  this.frames[0].env.set(a, pop());
  break;
case 'STORE_NONLOCAL': {
  const value = pop();
  const name = a;

  let env = this.currentFrame().env.parent;

  while (env) {
    if (name in env.values) {
      env.values[name] = value;
      break;
    }
    env = env.parent;
  }

  if (!env) {
    throw new RuntimeError(
      "SyntaxError",
      `no binding for nonlocal '${name}'`
    );
  }

  break;
}


case 'POP':
  pop();
  break;

          /* ---------- ARITHMETIC ---------- */
          case 'ADD': {
            const y = pop(), x = pop();
            if (typeof x === 'number' && typeof y === 'number')
              this.stack.push(x + y);
            else if (typeof x === 'string' && typeof y === 'string')
              this.stack.push(x + y);
            else
              throw TypeErrorR("unsupported operand types for +");
            break;
          }

          case 'SUB': {
            const y = pop(), x = pop();
            this.stack.push(x - y);
            break;
          }

          case 'MUL': {
            const y = pop(), x = pop();
            this.stack.push(x * y);
            break;
          }

          case 'DIV': {
            const y = pop(), x = pop();
            if (y === 0) throw ZeroDivisionErrorR("division by zero");
            this.stack.push(x / y);
            break;
          }

          case 'MOD': {
            const y = pop(), x = pop();
            if (y === 0) throw ZeroDivisionErrorR("modulo by zero");
            this.stack.push(x % y);
            break;
          }

          case 'IDIV': {
            const y = pop(), x = pop();
            if (y === 0) throw ZeroDivisionErrorR("integer division by zero");
            this.stack.push(Math.floor(x / y));
            break;
          }

          case 'NEG':
            this.stack.push(-pop());
            break;

          /* ---------- COMPARISONS ---------- */
          case 'EQ': { const y = pop(), x = pop(); this.stack.push(x === y); break; }
          case 'NE': { const y = pop(), x = pop(); this.stack.push(x !== y); break; }
          case 'LT': { const y = pop(), x = pop(); this.stack.push(x < y); break; }
          case 'GT': { const y = pop(), x = pop(); this.stack.push(x > y); break; }
          case 'LE': { const y = pop(), x = pop(); this.stack.push(x <= y); break; }
          case 'GE': { const y = pop(), x = pop(); this.stack.push(x >= y); break; }

          /* ---------- LOGICAL ---------- */
          case 'AND': this.stack.push(pop() && pop()); break;
          case 'OR':  this.stack.push(pop() || pop()); break;
          case 'NOT': this.stack.push(!pop()); break;

          /* ---------- CONTROL FLOW ---------- */
          case 'JUMP':
            // If we're jumping into a finally block or out of a try, remove that try
            // so it does not catch exceptions from handlers/finally.
            for (let i = exceptionStack.length - 1; i >= 0; i--) {
              const tryBlock = exceptionStack[i];
              if (a === tryBlock.finallyStart || a === tryBlock.endLabel) {
                exceptionStack.splice(i);
                break;
              }
            }
            this.ip = a;
            continue;

          case 'JUMP_IF_FALSE':
            if (!pop()) { this.ip = a; continue; }
            break;
case 'RAISE_TYPE_ERROR': {
  const msg = pop();
  throw new RuntimeError("TypeError", msg);
}

          /* ---------- CALL ---------- */
          case 'CALL': {
  const addr = a;
  const argc = b;
  const callInfo = c; // c is an object: { name: '...', kwargs: {...} } or { kwargs: {...} }

  /* ---------- BUILT-INS ---------- */
  if (addr == null && callInfo && typeof callInfo === 'object' && callInfo.name) {
    const fname = callInfo.name;

    // Pop keyword argument values from stack (if any)
    const kwargs = {};
    if (callInfo.kwargsNames && callInfo.kwargsCount) {
      for (let i = 0; i < callInfo.kwargsCount; i++) {
        const value = pop();
        const name = callInfo.kwargsNames[i];
        kwargs[name] = value;
      }
    }

    // Pop positional arguments
    const args = [];
    for (let i = 0; i < argc; i++) args.unshift(pop());

    if (fname === 'len') {
      if (argc !== 1) throw TypeErrorR("len() takes exactly one argument");
      const v = args[0];
      if (typeof v === 'string' || Array.isArray(v))
        this.stack.push(v.length);
      else if (v && typeof v === 'object' && v.__type === 'set') {
        // Count set elements
        this.stack.push(Object.keys(v).filter(k => !k.startsWith('__')).length);
      } else if (v && typeof v === 'object' && !Array.isArray(v) && !v.__type) {
        // Dictionary - count keys
        this.stack.push(Object.keys(v).length);
      } else
        throw TypeErrorR("len() unsupported type");
      break;
    }

    if (fname === 'input') {
      if (argc === 1) {
        const prompt = args[0];
        if (typeof prompt !== 'string')
          throw TypeErrorR("input() prompt must be string");
        process.stdout.write(prompt);
      }
      const line = this._readInputLine();
      this.stack.push(line);
      break;
    }

    if (fname === 'int') {
      if (argc !== 1)
        throw TypeErrorR("int() takes exactly one argument");
      const v = args[0];
      if (typeof v === 'number')
        this.stack.push(Math.trunc(v));
      else if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v))
        this.stack.push(Math.trunc(Number(v)));
      else
        throw TypeErrorR("int() argument must be numeric");
      break;
    }

    if (fname === 'str') {
      if (argc !== 1)
        throw TypeErrorR("str() takes exactly one argument");
      const v = args[0];
      if (v === true) this.stack.push('True');
      else if (v === false) this.stack.push('False');
      else if (v === null) this.stack.push('None');
      else if (Array.isArray(v)) {
        this.stack.push('[' + v.map(x => {
          if (x === true) return 'True';
          if (x === false) return 'False';
          if (typeof x === 'string') return '"' + x + '"';
          return String(x);
        }).join(',') + ']');
      } else {
        this.stack.push(String(v));
      }
      break;
    }

    throw new RuntimeError("NameError", `unknown function '${fname}'`);
  }

  /* ---------- FUNCTION VALUE CALL (f()) ---------- */
  if (addr === undefined && callInfo && typeof callInfo === 'object' && !callInfo.name) {

  // Pop positional arguments
  const args = [];
  for (let i = 0; i < argc; i++) args.unshift(pop());

  // Pop keyword argument values from stack
  const kwargs = {};
  if (callInfo && callInfo.kwargsNames && callInfo.kwargsCount) {
    for (let i = 0; i < callInfo.kwargsCount; i++) {
      const value = pop();
      const name = callInfo.kwargsNames[i];
      kwargs[name] = value;
    }
  }

  const fn = pop();
  
  // v2.0: Handle bound methods (from attribute access)
  if (fn && fn.__type === 'method' && fn.__self) {
    // This is a bound method call
    const method = fn;
    const self = method.__self;
    
    // Create new frame
    const newFrame = {
      returnIp: this.ip + 1,
      env: new Env(method.env)
    };
    
    newFrame.env.set('self', self);
    
    // Set up arguments
    for (let i = 0; i < method.argc; i++) {
      newFrame.env.set(`$arg${i}`, null);
    }
    
    args.forEach((v, i) => {
      newFrame.env.set(`$arg${i}`, v);
    });
    
    for (const [name, value] of Object.entries(kwargs)) {
      const index = method.paramIndex[name];
      if (index === undefined) {
        throw new RuntimeError(
          "TypeError",
          `unexpected keyword argument '${name}'`
        );
      }
      if (newFrame.env.get(`$arg${index}`) !== null) {
        throw new RuntimeError(
          "TypeError",
          `multiple values for argument '${name}'`
        );
      }
      newFrame.env.set(`$arg${index}`, value);
    }
    
    this.frames.push(newFrame);
    this.ip = method.entry;
    continue;
  }
  
  // v2.0: Handle class instantiation
  if (fn && fn.__type === 'class') {
    // Create instance
    const instance = {
      __type: 'instance',
      __class: fn
    };
    
    // Call __init__ if it exists
    if (fn.__methods && '__init__' in fn.__methods) {
      const initMethod = fn.__methods['__init__'];
      
      // Create frame for __init__
      // Store instance in frame so we can push it after __init__ returns
      this.frames.push({
        returnIp: this.ip + 1,
        env: new Env(initMethod.env),
        __initInstance: instance  // Store instance for after __init__ returns
      });
      
      const newFrame = this.currentFrame();
      // self is first parameter, so it goes in $arg0
      newFrame.env.set('$arg0', instance);
      newFrame.env.set('self', instance);
      
      // Set up argument slots (self is at $arg0, so user args start at $arg1)
      for (let i = 0; i < initMethod.argc; i++) {
        newFrame.env.set(`$arg${i}`, null);
      }
      
      // Set self at $arg0
      newFrame.env.set('$arg0', instance);
      
      // Set up positional arguments (starting from $arg1, since $arg0 is self)
      args.forEach((v, i) => {
        newFrame.env.set(`$arg${i + 1}`, v);
      });
      
      for (const [name, value] of Object.entries(kwargs)) {
        const index = initMethod.paramIndex[name];
        if (index === undefined) {
          throw new RuntimeError(
            "TypeError",
            `unexpected keyword argument '${name}'`
          );
        }
        if (newFrame.env.get(`$arg${index}`) !== null && index !== 0) {
          throw new RuntimeError(
            "TypeError",
            `multiple values for argument '${name}'`
          );
        }
        newFrame.env.set(`$arg${index}`, value);
      }
      
      this.ip = initMethod.entry;
      continue; // Will return here after __init__ completes
    }
    
    // No __init__, just return the instance
    this.stack.push(instance);
    break;
  }
  
  if (!fn || fn.__type !== 'function')
    throw new RuntimeError("TypeError", "object is not callable");

  this.frames.push({
    returnIp: this.ip + 1,
    env: new Env(fn.env)
  });

  const newFrame = this.currentFrame();

// create empty arg slots
for (let i = 0; i < fn.argc; i++) {
  newFrame.env.set(`$arg${i}`, null);
}

// positional first
args.forEach((v, i) => {
  newFrame.env.set(`$arg${i}`, v);
});

// keyword arguments
for (const [name, value] of Object.entries(kwargs)) {
  const index = fn.paramIndex[name];
  if (index === undefined) {
    throw new RuntimeError(
      "TypeError",
      `unexpected keyword argument '${name}'`
    );
  }
  if (newFrame.env.get(`$arg${index}`) !== null) {
    throw new RuntimeError(
      "TypeError",
      `multiple values for argument '${name}'`
    );
  }
  newFrame.env.set(`$arg${index}`, value);
}

  this.ip = fn.entry;
  continue;
}

  /* ---------- NAMED FUNCTION CALL ---------- */
  const args = [];
  for (let i = 0; i < argc; i++) args.unshift(pop());

  this.frames.push({
    returnIp: this.ip+1,
    env: new Env(null)
  });

  const newFrame = this.currentFrame();
  args.forEach((v, i) => newFrame.env.set(`$arg${i}`, v));

  this.ip = addr;
  continue;
}


          /* ---------- RETURNS ---------- */
        case 'RETURN_VAL': {
  const val = pop();
  const frame = this.frames.pop();
  this.ip = frame.returnIp;
  // If returning from __init__, push the instance instead of return value
  if (frame.__initInstance) {
    this.stack.push(frame.__initInstance);
  } else {
    this.stack.push(val);
  }
  continue;
}

case 'MAKE_FUNCTION': {
  this.stack.push({
    __type: 'function',
    entry: a.entry,
    argc: a.argc,
    paramIndex: a.paramIndex,   // 🔥 ADD THIS LINE
    env: this.currentFrame().env
  });
  break;
}

/* ---------- CLASSES & OBJECTS (v2.0) ---------- */
case 'MAKE_CLASS': {
  const classInfo = a;
  const baseClass = classInfo.baseClass === 'stack' ? pop() : (classInfo.baseClass || null);
  
  // Ensure baseClass is a class object (if it was loaded from environment, it should be)
  if (baseClass && baseClass.__type !== 'class') {
    throw new RuntimeError("TypeError", `base class must be a class, got ${typeof baseClass}`);
  }
  
  // Create class object
  const classObj = {
    __type: 'class',
    __name: classInfo.name,
    __base: baseClass,  // This should be the actual class object from the environment
    __methods: {},
    __methodEntries: {}
  };
  
  // Store methods
  classInfo.methods.forEach(method => {
    classObj.__methods[method.name] = {
      __type: 'method',
      entry: method.entry,
      argc: method.argc,
      paramIndex: method.paramIndex,
      env: this.currentFrame().env,
      __class: classObj
    };
    classObj.__methodEntries[method.name] = method.entry;
  });
  
  this.stack.push(classObj);
  break;
}

case 'LOAD_ATTR': {
  const attrName = a;
  const obj = pop();
  
  // v2.1: Handle built-in types (strings, lists, dicts, sets) - attribute-based behavior
  // Check strings first (before object check)
  if (typeof obj === 'string') {
    // Special case: str.join() - join is called on the separator string
    if (attrName === 'join') {
      this.stack.push({
        __type: 'builtin_method',
        __name: 'join',
        __obj: obj,
        __objType: 'string',
        __method: (iterable) => {
          if (!Array.isArray(iterable)) {
            throw new RuntimeError("TypeError", "join() argument must be a list");
          }
          return iterable.map(x => String(x)).join(obj);
        }
      });
      break;
    }
    
    // String methods
    const stringMethods = {
      'upper': () => obj.toUpperCase(),
      'lower': () => obj.toLowerCase(),
      'split': (sep = null) => {
        const separator = sep !== null ? String(sep) : /\s+/;
        return obj.split(separator === ' ' ? /\s+/ : separator);
      }
    };
    if (attrName in stringMethods) {
      // Return a bound method-like object
      this.stack.push({
        __type: 'builtin_method',
        __name: attrName,
        __obj: obj,
        __objType: 'string',
        __method: stringMethods[attrName]
      });
      break;
    }
    // If method not found for string, throw error
    throw new RuntimeError("AttributeError", `'str' object has no attribute '${attrName}'`);
  }
  
  if (Array.isArray(obj)) {
    // List methods (beyond append/pop)
    const listMethods = {
      'count': (value) => obj.filter(x => x === value).length,
      'index': (value) => {
        const idx = obj.indexOf(value);
        if (idx === -1) throw new RuntimeError("ValueError", "value not in list");
        return idx;
      },
      'insert': (index, value) => {
        obj.splice(index, 0, value);
        return null;
      },
      'remove': (value) => {
        const idx = obj.indexOf(value);
        if (idx === -1) throw new RuntimeError("ValueError", "value not in list");
        obj.splice(idx, 1);
        return null;
      },
      'reverse': () => {
        obj.reverse();
        return null;
      },
      'sort': () => {
        obj.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          return String(a).localeCompare(String(b));
        });
        return null;
      }
    };
    if (attrName in listMethods) {
      this.stack.push({
        __type: 'builtin_method',
        __name: attrName,
        __obj: obj,
        __objType: 'list',
        __method: listMethods[attrName]
      });
      break;
    }
    // If method not found for list, throw error
    throw new RuntimeError("AttributeError", `'list' object has no attribute '${attrName}'`);
  }
  
  // Check sets BEFORE dictionaries (sets have __type === 'set')
  if (typeof obj === 'object' && obj !== null && obj.__type === 'set') {
    // Set methods
    const setMethods = {
      'add': (value) => {
        const key = String(value);
        obj[key] = value;
        return null;
      },
      'remove': (value) => {
        const key = String(value);
        if (!(key in obj)) throw new RuntimeError("KeyError", "value not in set");
        delete obj[key];
        return null;
      },
      'discard': (value) => {
        const key = String(value);
        delete obj[key];
        return null;
      },
      'union': (other) => {
        const result = { __type: 'set' };
        Object.keys(obj).filter(k => !k.startsWith('__')).forEach(k => result[k] = obj[k]);
        if (other && other.__type === 'set') {
          Object.keys(other).filter(k => !k.startsWith('__')).forEach(k => result[k] = other[k]);
        }
        return result;
      },
      'intersection': (other) => {
        const result = { __type: 'set' };
        if (other && other.__type === 'set') {
          Object.keys(obj).filter(k => !k.startsWith('__')).forEach(k => {
            if (k in other) result[k] = obj[k];
          });
        }
        return result;
      }
    };
    if (attrName in setMethods) {
      this.stack.push({
        __type: 'builtin_method',
        __name: attrName,
        __obj: obj,
        __objType: 'set',
        __method: setMethods[attrName]
      });
      break;
    }
    // If method not found for set, throw error
    throw new RuntimeError("AttributeError", `'set' object has no attribute '${attrName}'`);
  }
  
  if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !obj.__type) {
    // Dictionary methods
    const dictMethods = {
      'keys': () => {
        return Object.keys(obj).filter(k => !k.startsWith('__'));
      },
      'values': () => {
        const keys = Object.keys(obj).filter(k => !k.startsWith('__'));
        return keys.map(k => obj[k]);
      },
      'items': () => {
        const keys = Object.keys(obj).filter(k => !k.startsWith('__'));
        return keys.map(k => [k, obj[k]]);
      }
    };
    if (attrName in dictMethods) {
      this.stack.push({
        __type: 'builtin_method',
        __name: attrName,
        __obj: obj,
        __objType: 'dict',
        __method: dictMethods[attrName]
      });
      break;
    }
    // If method not found for dict, throw error
    throw new RuntimeError("AttributeError", `'dict' object has no attribute '${attrName}'`);
  }
  
  // Only check for object type if we haven't handled built-in types above
  // But first, check if obj is null/undefined (which would fail the checks above)
  if (obj === null || obj === undefined) {
    throw TypeErrorR(`attribute access on null/undefined`);
  }
  
  if (typeof obj !== 'object' && typeof obj !== 'string') {
    throw TypeErrorR(`attribute access on non-object`);
  }
  
  // v2.0: Handle super objects
  if (obj.__type === 'super') {
    const self = obj.__self;
    const baseClass = obj.__class;
    
    if (!baseClass) {
      throw new RuntimeError("RuntimeError", "super() has no base class");
    }
    
    // Look for method in base class (check __methods dictionary)
    if (baseClass && baseClass.__methods && typeof baseClass.__methods === 'object' && attrName in baseClass.__methods) {
      const method = baseClass.__methods[attrName];
      this.stack.push({
        ...method,
        __self: self  // Bind to original self
      });
      break;
    }
    
    // If not found, check if baseClass itself is a class object and has the method
    if (baseClass && baseClass.__type === 'class' && baseClass.__methods && attrName in baseClass.__methods) {
      const method = baseClass.__methods[attrName];
      this.stack.push({
        ...method,
        __self: self
      });
      break;
    }
    
    throw new RuntimeError("AttributeError", `'${baseClass?.__name || 'object'}' object has no attribute '${attrName}'`);
  }
  
  // If it's an instance, look in instance attributes first
  if (obj && typeof obj === 'object' && obj.__type === 'instance') {
    if (attrName in obj && !attrName.startsWith('__')) {
      this.stack.push(obj[attrName]);
      break;
    }
    // Then look in class methods
    if (obj.__class && obj.__class.__methods && attrName in obj.__class.__methods) {
      // Return bound method
      const method = obj.__class.__methods[attrName];
      this.stack.push({
        ...method,
        __self: obj  // Bind self
      });
      break;
    }
    // Then look in base classes (method resolution order)
    let currentClass = obj.__class ? obj.__class.__base : null;
    while (currentClass) {
      if (currentClass.__methods && attrName in currentClass.__methods) {
        const method = currentClass.__methods[attrName];
        this.stack.push({
          ...method,
          __self: obj
        });
        break;
      }
      currentClass = currentClass.__base;
    }
    if (currentClass) break; // Found in base class
    
    // Method not found in instance or class hierarchy
    throw new RuntimeError("AttributeError", `'${obj.__class?.__name || 'object'}' object has no attribute '${attrName}'`);
  }
  
  // For class objects, look in class methods
  if (obj.__type === 'class') {
    if (obj.__methods && attrName in obj.__methods) {
      this.stack.push(obj.__methods[attrName]);
      break;
    }
    // Also check base class
    if (obj.__base && obj.__base.__methods && attrName in obj.__base.__methods) {
      this.stack.push(obj.__base.__methods[attrName]);
      break;
    }
  }
  
  throw new RuntimeError("AttributeError", `'${obj.__type === 'instance' ? (obj.__class?.__name || 'object') : (obj.__name || 'object')}' object has no attribute '${attrName}'`);
}

case 'STORE_ATTR': {
  const attrName = a;
  const value = pop();
  const obj = pop();
  
  if (!obj || typeof obj !== 'object' || obj.__type !== 'instance') {
    throw TypeErrorR(`attribute assignment on non-instance`);
  }
  
  obj[attrName] = value;
  break;
}

case 'CALL_METHOD': {
  const callInfo = a;
  const methodName = callInfo.method;
  const argc = callInfo.argc || 0;
  
  // Pop keyword arguments
  const kwargs = {};
  if (callInfo.kwargsNames && callInfo.kwargsCount) {
    for (let i = 0; i < callInfo.kwargsCount; i++) {
      const value = pop();
      const name = callInfo.kwargsNames[i];
      kwargs[name] = value;
    }
  }
  
  // Pop positional arguments
  const args = [];
  for (let i = 0; i < argc; i++) args.unshift(pop());
  
  // Pop self (object) or builtin method
  const selfOrMethod = pop();
  
  // v2.1: Handle builtin methods (strings, lists, dicts, sets)
  // Also handle bound methods from class instances (they have __self property)
  if (selfOrMethod && typeof selfOrMethod === 'object') {
    if (selfOrMethod.__type === 'builtin_method') {
    const method = selfOrMethod.__method;
    const obj = selfOrMethod.__obj;
    const objType = selfOrMethod.__objType;
    const builtinMethodName = selfOrMethod.__name;
    
    // Verify method name matches
    if (builtinMethodName !== methodName) {
      throw new RuntimeError("AttributeError", `'${objType}' object has no method '${methodName}'`);
    }
    
    try {
      // Call the builtin method with arguments
      let result;
      if (builtinMethodName === 'split' && objType === 'string') {
        // split() can take optional separator
        result = method(args[0] || null);
      } else if (builtinMethodName === 'join' && objType === 'string') {
        // join() takes the iterable as first argument
        if (args.length === 0) {
          throw new RuntimeError("TypeError", "join() takes exactly one argument");
        }
        result = method(args[0]);
      } else if (builtinMethodName === 'insert' && objType === 'list') {
        // insert() takes index and value
        if (args.length < 2) {
          throw new RuntimeError("TypeError", "insert() takes exactly 2 arguments");
        }
        result = method(args[0], args[1]);
      } else if (builtinMethodName === 'union' || builtinMethodName === 'intersection') {
        // Set operations take other set
        result = method(args[0]);
      } else if (builtinMethodName === 'remove' && objType === 'list') {
        // remove() takes value
        if (args.length === 0) {
          throw new RuntimeError("TypeError", "remove() takes exactly one argument");
        }
        result = method(args[0]);
      } else if (builtinMethodName === 'index' && objType === 'list') {
        // index() takes value
        if (args.length === 0) {
          throw new RuntimeError("TypeError", "index() takes exactly one argument");
        }
        result = method(args[0]);
      } else if (builtinMethodName === 'count' && objType === 'list') {
        // count() takes value
        if (args.length === 0) {
          throw new RuntimeError("TypeError", "count() takes exactly one argument");
        }
        result = method(args[0]);
      } else {
        // Most methods take a single argument or no arguments
        result = args.length > 0 ? method(args[0]) : method();
      }
      
      // Methods that modify in-place return None (null)
      if (result === null || result === undefined) {
        this.stack.push(null);
      } else {
        this.stack.push(result);
      }
      break;
    } catch (e) {
      if (e instanceof RuntimeError) throw e;
      throw new RuntimeError("RuntimeError", String(e));
    }
    }
    
    // Handle bound methods from class instances (have __self and __type: 'method')
    if (selfOrMethod.__type === 'method' && selfOrMethod.__self) {
      const method = selfOrMethod;
      const self = method.__self;
      
      // Create new frame
      const newFrame = {
        returnIp: this.ip + 1,
        env: new Env(method.env)
      };
      
      // Set up arguments: self is first parameter
      newFrame.env.set('$arg0', self);
      newFrame.env.set('self', self);
      
      // Set up positional arguments (starting from $arg1, since $arg0 is self)
      for (let i = 0; i < args.length; i++) {
        newFrame.env.set(`$arg${i + 1}`, args[i]);
      }
      
      // Set up keyword arguments
      Object.keys(kwargs).forEach(key => {
        if (method.paramIndex && key in method.paramIndex) {
          const idx = method.paramIndex[key];
          newFrame.env.set(`$arg${idx}`, kwargs[key]);
        } else {
          newFrame.env.set(key, kwargs[key]);
        }
      });
      
      this.frames.push(newFrame);
      this.ip = method.entry;
      continue;
    }
  }
  
  const self = selfOrMethod;
  if (!self || typeof self !== 'object') {
    throw TypeErrorR(`method call on non-object`);
  }
  
  // Find method
  let method = null;
  if (self.__type === 'instance' && self.__class) {
    // Look in instance's class
    if (self.__class.__methods && methodName in self.__class.__methods) {
      method = self.__class.__methods[methodName];
    } else {
      // Look in base classes
      let currentClass = self.__class.__base;
      while (currentClass) {
        if (currentClass.__methods && methodName in currentClass.__methods) {
          method = currentClass.__methods[methodName];
          break;
        }
        currentClass = currentClass.__base;
      }
    }
  }
  
  if (!method) {
    throw new RuntimeError("AttributeError", `'${self.__class?.__name || 'object'}' object has no method '${methodName}'`);
  }
  
  // Create new frame
  const newFrame = {
    returnIp: this.ip + 1,
    env: new Env(method.env)  // Lexical scope
  };
  
  // Set up arguments: self is first parameter
  // Methods expect self as first param, so $arg0 = self
  newFrame.env.set('$arg0', self);
  // Also set 'self' variable directly for method body access
  newFrame.env.set('self', self);
  
  // Set up positional arguments (starting from $arg1, since $arg0 is self)
  for (let i = 0; i < args.length; i++) {
    newFrame.env.set(`$arg${i + 1}`, args[i]);
  }
  
  // Set up keyword arguments
  Object.keys(kwargs).forEach(key => {
    if (method.paramIndex && key in method.paramIndex) {
      const idx = method.paramIndex[key];
      // paramIndex maps param names to indices (self=0, next=1, etc.)
      newFrame.env.set(`$arg${idx}`, kwargs[key]);
    } else {
      newFrame.env.set(key, kwargs[key]);
    }
  });
  
  this.frames.push(newFrame);
  this.ip = method.entry;
  continue;
}

case 'LOAD_SUPER': {
  // Get current method's self from the frame
  const currentFrame = this.currentFrame();
  const self = currentFrame.env.get('self');
  
  if (!self || self.__type !== 'instance' || !self.__class) {
    throw new RuntimeError("RuntimeError", "super() can only be used in methods");
  }
  
  // Push super object (contains self and class)
  this.stack.push({
    __type: 'super',
    __self: self,
    __class: self.__class.__base || null
  });
  break;
}

// Note: CALL_SUPER is not needed - super().method() is handled through
// LOAD_ATTR (on super object) + CALL_METHOD (on the bound method)

case 'RETURN': {
  const frame = this.frames.pop();
  this.ip = frame.returnIp;

  // If returning from __init__, push the instance instead of None
  if (frame.__initInstance) {
    this.stack.push(frame.__initInstance);
  } else {
    // ✅ Python semantics: return None
    this.stack.push(null);
  }
  continue;
}



          /* ---------- LIST ---------- */
          case 'BUILD_LIST': {
            const items = [];
            for (let i = 0; i < a; i++) items.unshift(pop());
            this._heapCells += items.length;
            this.stack.push(items);
            break;
          }

          /* ---------- DICTIONARY ---------- */
          case 'BUILD_DICT': {
            const dict = {};
            for (let i = 0; i < a; i++) {
              const value = pop();
              const key = pop();
              // Convert key to string for indexing (Python dicts use string keys)
              const keyStr = String(key);
              dict[keyStr] = value;
            }
            this._heapCells += a * 2;
            this.stack.push(dict);
            break;
          }

          /* ---------- TUPLE ---------- */
          case 'BUILD_TUPLE': {
            const items = [];
            for (let i = 0; i < a; i++) items.unshift(pop());
            // Mark as tuple (immutable array-like)
            const tuple = items;
            tuple.__type = 'tuple';
            this._heapCells += items.length;
            this.stack.push(tuple);
            break;
          }

          /* ---------- SET ---------- */
          case 'BUILD_SET': {
            const items = [];
            for (let i = 0; i < a; i++) items.unshift(pop());
            // Create a Set-like object (using object with __type for now)
            const set = { __type: 'set' }; // Set __type first
            items.forEach(item => {
              const key = String(item);
              set[key] = item;
            });
            this._heapCells += items.length;
            this.stack.push(set);
            break;
          }

          case 'LOAD_INDEX': {
            const idx = pop(), obj = pop();
            if (Array.isArray(obj) || typeof obj === 'string') {
              const i = idx < 0 ? obj.length + idx : idx;
              this.stack.push(obj[i]);
            } else if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !obj.__type) {
              // Dictionary access
              const keyStr = String(idx);
              this.stack.push(obj[keyStr] !== undefined ? obj[keyStr] : null);
            } else {
              throw TypeErrorR("indexing unsupported type");
            }
            break;
          }

          case 'STORE_INDEX': {
            const v = pop(), idx = pop(), obj = pop();
            if (Array.isArray(obj)) {
              const i = idx < 0 ? obj.length + idx : idx;
              obj[i] = v;
            } else if (typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !obj.__type) {
              // Dictionary assignment
              const keyStr = String(idx);
              obj[keyStr] = v;
            } else {
              throw TypeErrorR("assignment to non-list/non-dict");
            }
            break;
          }

          case 'STORE_SLICE': {
            const value = pop(), step = pop(), end = pop(), start = pop(), obj = pop();
            if (!Array.isArray(obj) && typeof obj !== 'string')
              throw TypeErrorR("slice assignment to unsupported type");
            
            const startIdx = start !== null ? (start >= 0 ? start : obj.length + start) : 0;
            const endIdx = end !== null ? (end >= 0 ? end : obj.length + end) : obj.length;
            const stepVal = step !== null ? step : 1;
            
            if (typeof obj === 'string') {
              // String slice assignment: convert to array, modify, convert back
              const arr = obj.split('');
              if (stepVal === 1) {
                // Simple slice replacement
                const replacement = Array.isArray(value) ? value : (typeof value === 'string' ? value.split('') : [value]);
                arr.splice(startIdx, endIdx - startIdx, ...replacement);
                // Note: We can't modify strings in place, so this would need special handling
                // For now, throw error as strings are immutable in our model
                throw TypeErrorR("string slice assignment not supported (strings are immutable)");
              } else {
                throw TypeErrorR("step slice assignment not supported for strings");
              }
            } else {
              // List slice assignment
              if (stepVal === 1) {
                // Simple slice replacement
                const replacement = Array.isArray(value) ? value : [value];
                obj.splice(startIdx, endIdx - startIdx, ...replacement);
              } else if (stepVal !== 1) {
                // Step slice assignment: replace elements at step intervals
                // Python semantics: the number of elements to replace must match
                const replacement = Array.isArray(value) ? value : [value];
                
                // Calculate indices that will be replaced
                const indicesToReplace = [];
                if (stepVal > 0) {
                  for (let i = startIdx; i < endIdx; i += stepVal) {
                    if (i >= 0 && i < obj.length) {
                      indicesToReplace.push(i);
                    }
                  }
                } else if (stepVal < 0) {
                  // Negative step: go backwards
                  const actualStart = startIdx >= 0 ? startIdx : obj.length + startIdx;
                  const actualEnd = endIdx >= 0 ? endIdx : obj.length + endIdx;
                  for (let i = actualStart; i > actualEnd; i += stepVal) {
                    if (i >= 0 && i < obj.length) {
                      indicesToReplace.push(i);
                    }
                  }
                }
                
                // Check if replacement count matches
                if (replacement.length !== indicesToReplace.length) {
                  throw TypeErrorR(`attempt to assign sequence of size ${replacement.length} to extended slice of size ${indicesToReplace.length}`);
                }
                
                // Replace elements
                for (let i = 0; i < indicesToReplace.length; i++) {
                  obj[indicesToReplace[i]] = replacement[i];
                }
              } else {
                throw TypeErrorR("slice step cannot be zero");
              }
            }
            break;
          }

          case 'SLICE': {
            const step = pop(), end = pop(), start = pop(), obj = pop();
            if (!Array.isArray(obj) && typeof obj !== 'string')
              throw TypeErrorR("slicing unsupported type");
            
            // Handle step slicing
            const stepVal = step !== null ? step : 1;
            
            if (stepVal === 1) {
              // Simple slice without step
              const startIdx = start !== null ? (start >= 0 ? start : obj.length + start) : 0;
              const endIdx = end !== null ? (end >= 0 ? end : obj.length + end) : obj.length;
              this.stack.push(obj.slice(startIdx, endIdx));
            } else if (stepVal > 0) {
              // Positive step
              const startIdx = start !== null ? (start >= 0 ? start : obj.length + start) : 0;
              const endIdx = end !== null ? (end >= 0 ? end : obj.length + end) : obj.length;
              const result = [];
              for (let i = startIdx; i < endIdx; i += stepVal) {
                if (i >= 0 && i < obj.length) result.push(obj[i]);
              }
              this.stack.push(typeof obj === 'string' ? result.join('') : result);
            } else if (stepVal < 0) {
              // Negative step: reverse direction
              const startIdx = start !== null ? (start >= 0 ? start : obj.length + start) : obj.length - 1;
              const endIdx = end !== null ? (end >= 0 ? end : obj.length + end) : -1;
              const result = [];
              for (let i = startIdx; i > endIdx; i += stepVal) {
                if (i >= 0 && i < obj.length) result.push(obj[i]);
              }
              this.stack.push(typeof obj === 'string' ? result.join('') : result);
            } else {
              throw TypeErrorR("slice step cannot be zero");
            }
            break;
          }

          /* ---------- LIST METHODS ---------- */
          case 'LIST_APPEND': {
            const value = pop();
            const list = pop();
            if (!Array.isArray(list))
              throw TypeErrorR("append() on non-list");
            list.push(value);
            this.stack.push(null); // Push None so POP can discard it
            break;
          }

          case 'LIST_POP': {
            const list = pop();
            if (!Array.isArray(list))
              throw TypeErrorR("pop() on non-list");
            if (list.length === 0)
              throw IndexErrorR("pop from empty list");
            this.stack.push(list.pop());
            break;
          }

          /* ---------- OUTPUT ---------- */
          case 'PRINT': {
            // Check for end parameter (optional)
            const printInfo = a || {};
            const hasEnd = printInfo.hasEnd === true;
            const endValue = hasEnd ? pop() : "\n";
            
            // Check if we just returned from __str__
            if (this.stack.length > 0 && this.stack[this.stack.length - 1] && 
                typeof this.stack[this.stack.length - 1] === 'object' && 
                this.stack[this.stack.length - 1].__printMarker) {
              const marker = pop();
              const strValue = pop(); // __str__ return value
              if (hasEnd) {
                process.stdout.write(String(strValue) + String(endValue));
              } else {
                console.log(strValue);
              }
              break;
            }
            
            const value = pop();
            // v2.0: Call __str__ on objects if available
            if (value && typeof value === 'object' && value.__type === 'instance') {
              if (value.__class && value.__class.__methods && '__str__' in value.__class.__methods) {
                const strMethod = value.__class.__methods['__str__'];
                // Push end value and marker to indicate we're printing
                if (hasEnd) this.stack.push(endValue);
                this.stack.push({ __printMarker: true });
                // Call __str__ method
                const newFrame = {
                  returnIp: this.ip,  // Return to same instruction
                  env: new Env(strMethod.env)
                };
                // Set up self parameter (methods expect self at $arg0)
                newFrame.env.set('$arg0', value);
                newFrame.env.set('self', value);
                for (let i = 0; i < strMethod.argc; i++) {
                  newFrame.env.set(`$arg${i}`, null);
                }
                // Re-set $arg0 after initializing slots
                newFrame.env.set('$arg0', value);
                this.frames.push(newFrame);
                this.ip = strMethod.entry;
                continue; // Execute __str__, will return here
              }
            }
            // Format output: True/False for booleans, proper list format
            let output = value;
            if (value === true) output = 'True';
            else if (value === false) output = 'False';
            else if (Array.isArray(value)) {
              output = '[' + value.map(v => {
                if (v === true) return 'True';
                if (v === false) return 'False';
                if (typeof v === 'string') return '"' + v + '"';
                return String(v);
              }).join(',') + ']';
            } else if (value && typeof value === 'object' && value.__type === 'set') {
              // Set-like object: { __type: 'set', key: value, ... }
              const keys = Object.keys(value).filter(k => k !== '__type').sort();
              const items = keys.map(k => {
                const v = value[k];
                if (v === true) return 'True';
                if (v === false) return 'False';
                if (typeof v === 'string') return '"' + v + '"';
                return String(v);
              });
              output = '{' + items.join(',') + '}';
            } else if (value && typeof value === 'object' && !value.__type) {
              // Dict-like plain object
              const keys = Object.keys(value).sort();
              const pairs = keys.map(k => {
                const v = value[k];
                const kk = typeof k === 'string' ? '"' + k + '"' : String(k);
                let vv = v;
                if (v === true) vv = 'True';
                else if (v === false) vv = 'False';
                else if (typeof v === 'string') vv = '"' + v + '"';
                else vv = String(v);
                return `${kk}:${vv}`;
              });
              output = '{' + pairs.join(',') + '}';
            } else if (value && typeof value === 'object' && value.__type === 'instance') {
              // Default instance representation
              output = `<${value.__class?.__name || 'object'} instance>`;
            }
            
            // Use end parameter if provided
            if (hasEnd) {
              process.stdout.write(String(output) + String(endValue));
            } else {
              console.log(output);
            }
            break;
          }

          case 'PRINT_INLINE': {
            // Check if we just returned from __str__
            if (this.stack.length > 0 && this.stack[this.stack.length - 1] && 
                typeof this.stack[this.stack.length - 1] === 'object' && 
                this.stack[this.stack.length - 1].__printInlineMarker) {
              const marker = pop();
              const strValue = pop(); // __str__ return value
              process.stdout.write(String(strValue));
              break;
            }
            
            const value = pop();
            // v2.0: Call __str__ on objects if available  
            if (value && typeof value === 'object' && value.__type === 'instance') {
              if (value.__class && value.__class.__methods && '__str__' in value.__class.__methods) {
                const strMethod = value.__class.__methods['__str__'];
                this.stack.push({ __printInlineMarker: true });
                const newFrame = {
                  returnIp: this.ip,  // Return to same instruction
                  env: new Env(strMethod.env)
                };
                // Set up self parameter (methods expect self at $arg0)
                newFrame.env.set('$arg0', value);
                newFrame.env.set('self', value);
                for (let i = 0; i < strMethod.argc; i++) {
                  newFrame.env.set(`$arg${i}`, null);
                }
                // Re-set $arg0 after initializing slots
                newFrame.env.set('$arg0', value);
                this.frames.push(newFrame);
                this.ip = strMethod.entry;
                continue;
              }
            }
            // Format output
            let output = value;
            if (value === true) output = 'True';
            else if (value === false) output = 'False';
            else if (Array.isArray(value)) {
              output = '[' + value.map(v => {
                if (v === true) return 'True';
                if (v === false) return 'False';
                if (typeof v === 'string') return '"' + v + '"';
                return String(v);
              }).join(',') + ']';
            }
            process.stdout.write(String(output));
            break;
          }

          /* ---------- EXCEPTIONS ---------- */
          case 'TRY': {
            // Register try block in exception stack
            // tryStart is the bytecode index of the instruction after TRY (first try body instruction)
            // tryEnd is the bytecode index after the try body
            const tryInfo = a; // { tryStart, tryEnd, exceptHandlers, finallyStart, endLabel }
            exceptionStack.push({ ...tryInfo });
            // TRY instruction itself does nothing, just marks the start
            break;
          }

          case 'RAISE': {
            const exceptionValue = pop();
            // Find the innermost active try block that can handle this
            let handled = false;
            
            // Search from innermost to outermost
            for (let i = exceptionStack.length - 1; i >= 0; i--) {
              const tryBlock = exceptionStack[i];
              
              // Check if we're within the try block range
              // Note: tryStart is the first instruction of try body, tryEnd is after try body
              // The RAISE instruction itself is at this.ip, so check if it's within the try block
              if (this.ip >= tryBlock.tryStart && this.ip < tryBlock.tryEnd) {
                // Try to match an except handler
                for (const handler of tryBlock.exceptHandlers) {
                  // If no exception type specified, catch all
                  if (handler.exception === null || handler.exception === undefined) {
                    // Match - execute this handler
                    exceptionStack.splice(i);
                    if (handler.name) {
                      // Store exception in variable
                      env.set(handler.name, exceptionValue);
                    }
                    this.ip = handler.handlerStart;
                    handled = true;
                    break;
                  } else {
                    // For now, simple string matching (can be enhanced later)
                    // If exception is a string, compare directly
                    if (typeof exceptionValue === 'string' && handler.exception === exceptionValue) {
                      exceptionStack.splice(i);
                      if (handler.name) {
                        env.set(handler.name, exceptionValue);
                      }
                      this.ip = handler.handlerStart;
                      handled = true;
                      break;
                    }
                  }
                }
                
                if (handled) break;
              }
            }
            
            if (!handled) {
              // No handler found - rethrow as RuntimeError
              throw new RuntimeError("RuntimeError", String(exceptionValue));
            }
            continue;
          }

          case 'HALT':
            return;

          default:
            throw new RuntimeError("RuntimeError", `unknown instruction ${op}`);
        }

          this.ip++;
        }
        shouldContinue = false; // Normal exit from inner while loop
      } catch (e) {
        // When an exception is thrown, the IP hasn't been incremented yet
        // So the throwing instruction is at the current IP
        const throwingIp = this.ip;
        
        if (handleException(e, throwingIp)) {
          // Continue execution at handler or finally - restart the inner loop
          // Don't increment IP, it's already set by handleException
          // The outer while loop will continue, restarting the inner loop
        } else {
          // No handler found - print error and stop
          console.log(e.toString());
          shouldContinue = false;
        }
      }
    }
  }
}

module.exports = VirtualMachine;
