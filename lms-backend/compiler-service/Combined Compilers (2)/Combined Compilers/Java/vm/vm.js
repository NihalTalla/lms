const heap = require("../runtime/heap");
const ResourceTracker = require("../runtime/resource-tracker");
const readline = require("readline-sync");
function runtimeFail(kind, msg) {
  console.error(`RuntimeError: ${kind} failed: ${msg}`);
}

const {
  RuntimeError,
  TypeErrorR,
  IndexErrorR,
  ZeroDivisionErrorR
} = require("../runtime/errors");

class VirtualMachine {
  constructor(bytecode, limits = {}) {
    this.bytecode = bytecode;
    this.labels = {};
    this.resourceTracker = new ResourceTracker(limits);

   // collect labels (LABEL + FUNC_LABEL)
for (let i = 0; i < bytecode.length; i++) {
  if (
    bytecode[i].op === "LABEL" ||
    bytecode[i].op === "FUNC_LABEL"
  ) {
    this.labels[bytecode[i].arg] = i;
  }
}


    this.stack = [];
    this.frames = [];
    this.callStack = [];
    this.ip = 0;
    this.steps = 0;
    this.MAX_STEPS = 100000;

    // global frame
    this.frames.push({ returnIp: null, locals: {} });
    this.staticFields = {};
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

    const resolveVar = (name) => {
      const frame = this.currentFrame();
      if (name in frame.locals) return frame.locals[name];
      const globalFrame = this.frames[0];
      if (name in globalFrame.locals) return globalFrame.locals[name];
      throw new RuntimeError("NameError", `name '${name}' is not defined`);
    };

    try {
      while (this.ip < this.bytecode.length) {
        if (++this.steps > this.MAX_STEPS)
          throw new RuntimeError("RuntimeError", "execution limit exceeded");

        // Track instruction execution
        this.resourceTracker.recordInstruction();
        
        // Periodically check execution time (every 10000 instructions)
        if (this.steps % 10000 === 0) {
          this.resourceTracker.checkExecutionTime();
        }

        const { op, arg } = this.bytecode[this.ip];
        const vars = this.currentFrame().locals;

        switch (op) {
case "BIT_AND": {
  const b = pop();
  const a = pop();
  this.stack.push(a & b);
  break;
}

case "BIT_OR": {
  const b = pop();
  const a = pop();
  this.stack.push(a | b);
  break;
}

case "BIT_XOR": {
  const b = pop();
  const a = pop();
  this.stack.push(a ^ b);
  break;
}

case "BIT_NOT": {
  const a = pop();
  this.stack.push(~a);
  break;
}

case "SHL": {
  const b = pop();
  const a = pop();
  this.stack.push(a << b);
  break;
}

case "SHR": {
  const b = pop();
  const a = pop();
  this.stack.push(a >> b);
  break;
}
 case "STRING_CONCAT": {
  const b = pop();
  const a = pop();
  this.stack.push(String(a) + String(b));
  break;
}
case "LOAD_STATIC": {
  const { class: cls, field } = arg;
  if (!this.staticFields[cls]) {
    this.staticFields[cls] = {};
  }
  this.stack.push(this.staticFields[cls][field] ?? 0);
  break;
}

case "STORE_STATIC": {
  const value = this.stack.pop();
  const { class: cls, field } = arg;
  if (!this.staticFields[cls]) {
    this.staticFields[cls] = {};
  }
  this.staticFields[cls][field] = value;
  break;
}

// vm/vm.js (add DUP to switch)
case "DUP": {
  if (this.stack.length === 0) throw new RuntimeError("RuntimeError", "stack underflow");
  this.stack.push(this.stack[this.stack.length - 1]);
  break;
}
          /* ---------- CONSTANTS ---------- */
          case "LOAD_CONST":
            // Validate string length if constant is a string
            if (typeof arg === "string") {
              this.resourceTracker.validateStringLength(arg.length);
            }
            this.stack.push(arg);
            break;

          /* ---------- VARIABLES ---------- */
          case "LOAD_VAR":
            this.stack.push(resolveVar(arg));
            break;

           // LOAD_THIS case 
case "LOAD_THIS": {
  const frame = this.currentFrame();
  if (!("this" in frame.locals)) {
    throw new RuntimeError("ReferenceError", "'this' used in non-instance context");
  }
  this.stack.push(frame.locals["this"]);
  break;
}


          case "STORE_VAR":
            vars[arg] = pop();
            break;
case "ASSERT": {
  const msg = this.stack.pop();
  runtimeFail("assert", msg);
  return; // hard stop
}

case "REQUIRE": {
  const msg = this.stack.pop();
  runtimeFail("require", msg);
  return;
}

case "ENSURE": {
  const msg = this.stack.pop();
  runtimeFail("ensure", msg);
  return;
}

case "CHECK": {
  const msg = this.stack.pop();
  runtimeFail("check", msg);
  return;
}

case "TRAP": {
  const msg = this.stack.pop();
  console.log(`RuntimeError: trap: ${msg}`);
  return;
}

          /* ---------- OUTPUT ---------- */
          case "PRINT": {
            const val = pop();
            const str = String(val);
            this.resourceTracker.recordOutput(str.length);
            console.log(val);
            break;
          }
          
          /* ---------- OBJECT METHODS (v4.0) ---------- */
          case "OBJECT_TO_STRING": {
            const obj = pop();
            if (!obj || typeof obj !== "object" || !obj.__class) {
              throw new RuntimeError("TypeError", "objectToString on non-object");
            }
            // Return class name as string
            this.stack.push(obj.__class);
            break;
          }
          
          case "OBJECT_EQUALS": {
            const other = pop();
            const self = pop();
            // Reference equality: same object identity
            if (self === other) {
              this.stack.push(1);
            } else {
              this.stack.push(0);
            }
            break;
          }
          
          case "OBJECT_HASH_CODE": {
            const obj = pop();
            if (!obj || typeof obj !== "object") {
              throw new RuntimeError("TypeError", "hashCode on non-object");
            }
            // Simple hash based on object identity
            // Use a simple hash function on the object reference
            let hash = 0;
            const str = JSON.stringify(obj);
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            this.stack.push(Math.abs(hash));
            break;
          }
          
          /* ---------- COLLECTIONS (v4.2) ---------- */
          case "NEW_ARRAYLIST": {
            const heapId = heap.allocateArrayList();
            this.stack.push(heapId);
            break;
          }
          
          case "ARRAYLIST_ADD": {
            const element = pop();
            const listObj = pop();
            if (!listObj || typeof listObj !== "object" || !listObj.__class || listObj.__class !== "ArrayList") {
              throw new RuntimeError("TypeError", "ArrayList.add on non-ArrayList");
            }
            const heapId = listObj.fields.__heapId;
            const list = heap.getArrayList(heapId);
            list.push(element);
            break;
          }
          
          case "ARRAYLIST_GET": {
            const index = pop();
            const listObj = pop();
            if (!listObj || typeof listObj !== "object" || !listObj.__class || listObj.__class !== "ArrayList") {
              throw new RuntimeError("TypeError", "ArrayList.get on non-ArrayList");
            }
            const heapId = listObj.fields.__heapId;
            const list = heap.getArrayList(heapId);
            if (index < 0 || index >= list.length) {
              throw new RuntimeError("IndexError", `ArrayList index ${index} out of bounds`);
            }
            this.stack.push(list[index]);
            break;
          }
          
          case "ARRAYLIST_SIZE": {
            const listObj = pop();
            if (!listObj || typeof listObj !== "object" || !listObj.__class || listObj.__class !== "ArrayList") {
              throw new RuntimeError("TypeError", "ArrayList.size on non-ArrayList");
            }
            const heapId = listObj.fields.__heapId;
            const list = heap.getArrayList(heapId);
            this.stack.push(list.length);
            break;
          }
          
          case "NEW_HASHMAP": {
            const heapId = heap.allocateHashMap();
            this.stack.push(heapId);
            break;
          }
          
          case "HASHMAP_PUT": {
            const value = pop();
            const key = pop();
            const mapObj = pop();
            if (!mapObj || typeof mapObj !== "object" || !mapObj.__class || mapObj.__class !== "HashMap") {
              throw new RuntimeError("TypeError", "HashMap.put on non-HashMap");
            }
            const heapId = mapObj.fields.__heapId;
            const map = heap.getHashMap(heapId);
            // Use string representation of key for hashing
            const keyStr = String(key);
            map[keyStr] = value;
            break;
          }
          
          case "HASHMAP_GET": {
            const key = pop();
            const mapObj = pop();
            if (!mapObj || typeof mapObj !== "object" || !mapObj.__class || mapObj.__class !== "HashMap") {
              throw new RuntimeError("TypeError", "HashMap.get on non-HashMap");
            }
            const heapId = mapObj.fields.__heapId;
            const map = heap.getHashMap(heapId);
            const keyStr = String(key);
            const value = map[keyStr];
            // Return null (0) if key doesn't exist
            this.stack.push(value !== undefined ? value : 0);
            break;
          }
          
          case "HASHMAP_CONTAINS_KEY": {
            const key = pop();
            const mapObj = pop();
            if (!mapObj || typeof mapObj !== "object" || !mapObj.__class || mapObj.__class !== "HashMap") {
              throw new RuntimeError("TypeError", "HashMap.containsKey on non-HashMap");
            }
            const heapId = mapObj.fields.__heapId;
            const map = heap.getHashMap(heapId);
            const keyStr = String(key);
            this.stack.push(map[keyStr] !== undefined ? 1 : 0);
            break;
          }
          
          case "HASHMAP_SIZE": {
            const mapObj = pop();
            if (!mapObj || typeof mapObj !== "object" || !mapObj.__class || mapObj.__class !== "HashMap") {
              throw new RuntimeError("TypeError", "HashMap.size on non-HashMap");
            }
            const heapId = mapObj.fields.__heapId;
            const map = heap.getHashMap(heapId);
            this.stack.push(Object.keys(map).length);
            break;
          }
          
          /* ---------- ITERATORS (v4.3) ---------- */
          case "ARRAYLIST_ITERATOR": {
            const listObj = pop();
            if (!listObj || typeof listObj !== "object" || !listObj.__class || listObj.__class !== "ArrayList") {
              throw new RuntimeError("TypeError", "ArrayList.iterator on non-ArrayList");
            }
            const collectionId = listObj.fields.__heapId;
            const iteratorId = heap.allocateIterator("ArrayList", collectionId);
            
            // Create Iterator object
            const iteratorObj = {
              __class: "Iterator",
              fields: {
                __heapId: iteratorId
              }
            };
            this.stack.push(iteratorObj);
            break;
          }
          
          case "HASHMAP_ITERATOR": {
            const mapObj = pop();
            if (!mapObj || typeof mapObj !== "object" || !mapObj.__class || mapObj.__class !== "HashMap") {
              throw new RuntimeError("TypeError", "HashMap.iterator on non-HashMap");
            }
            const collectionId = mapObj.fields.__heapId;
            const map = heap.getHashMap(collectionId);
            // Get all keys
            const keys = Object.keys(map);
            const iteratorId = heap.allocateIterator("HashMap", collectionId, keys);
            
            // Create Iterator object
            const iteratorObj = {
              __class: "Iterator",
              fields: {
                __heapId: iteratorId
              }
            };
            this.stack.push(iteratorObj);
            break;
          }
          
          case "ITERATOR_HAS_NEXT": {
            const iteratorObj = pop();
            if (!iteratorObj || typeof iteratorObj !== "object" || !iteratorObj.__class || iteratorObj.__class !== "Iterator") {
              throw new RuntimeError("TypeError", "Iterator.hasNext on non-Iterator");
            }
            const iteratorId = iteratorObj.fields.__heapId;
            const iterator = heap.getIterator(iteratorId);
            
            if (iterator.collectionType === "ArrayList") {
              const list = heap.getArrayList(iterator.collectionId);
              this.stack.push(iterator.index < list.length ? 1 : 0);
            } else if (iterator.collectionType === "HashMap") {
              this.stack.push(iterator.index < iterator.keys.length ? 1 : 0);
            } else {
              throw new RuntimeError("TypeError", "Unknown collection type in iterator");
            }
            break;
          }
          
          case "ITERATOR_NEXT": {
            const iteratorObj = pop();
            if (!iteratorObj || typeof iteratorObj !== "object" || !iteratorObj.__class || iteratorObj.__class !== "Iterator") {
              throw new RuntimeError("TypeError", "Iterator.next on non-Iterator");
            }
            const iteratorId = iteratorObj.fields.__heapId;
            const iterator = heap.getIterator(iteratorId);
            
            if (iterator.collectionType === "ArrayList") {
              const list = heap.getArrayList(iterator.collectionId);
              if (iterator.index >= list.length) {
                throw new RuntimeError("IndexError", "Iterator has no more elements");
              }
              const value = list[iterator.index];
              iterator.index++;
              this.stack.push(value);
            } else if (iterator.collectionType === "HashMap") {
              if (iterator.index >= iterator.keys.length) {
                throw new RuntimeError("IndexError", "Iterator has no more elements");
              }
              const key = iterator.keys[iterator.index];
              const map = heap.getHashMap(iterator.collectionId);
              const value = map[key];
              iterator.index++;
              this.stack.push(value);
            } else {
              throw new RuntimeError("TypeError", "Unknown collection type in iterator");
            }
            break;
          }
          
          /* ---------- STRINGBUILDER (v4.5) ---------- */
          case "NEW_STRINGBUILDER": {
            const heapId = heap.allocateStringBuilder();
            this.stack.push(heapId);
            break;
          }
          
          case "STRINGBUILDER_APPEND": {
            const value = pop();
            const sbObj = pop();
            if (!sbObj || typeof sbObj !== "object" || !sbObj.__class || sbObj.__class !== "StringBuilder") {
              throw new RuntimeError("TypeError", "StringBuilder.append on non-StringBuilder");
            }
            const heapId = sbObj.fields.__heapId;
            const sb = heap.getStringBuilder(heapId);
            // Append value to string builder
            heap.objects[heapId] = sb + String(value);
            // Push StringBuilder object back for method chaining
            this.stack.push(sbObj);
            break;
          }
          
          case "STRINGBUILDER_TO_STRING": {
            const sbObj = pop();
            if (!sbObj || typeof sbObj !== "object" || !sbObj.__class || sbObj.__class !== "StringBuilder") {
              throw new RuntimeError("TypeError", "StringBuilder.toString on non-StringBuilder");
            }
            const heapId = sbObj.fields.__heapId;
            const sb = heap.getStringBuilder(heapId);
            this.stack.push(sb);
            break;
          }
          
          case "STRINGBUILDER_LENGTH": {
            const sbObj = pop();
            if (!sbObj || typeof sbObj !== "object" || !sbObj.__class || sbObj.__class !== "StringBuilder") {
              throw new RuntimeError("TypeError", "StringBuilder.length on non-StringBuilder");
            }
            const heapId = sbObj.fields.__heapId;
            const sb = heap.getStringBuilder(heapId);
            this.stack.push(sb.length);
            break;
          }
       
case "NEW_OBJECT": {
  let className;
  let fields;

  if (typeof arg === "string") {
    // STEP 2 style
    className = arg;
    fields = {};
  } else {
    // STEP 3 style
    className = arg.className;
    fields = arg.fields || {};
  }

  const obj = {
    __class: className,
    fields: { ...fields }
  };

  this.stack.push(obj);
  break;
}

case "LOAD_FIELD": {
  const obj = this.stack.pop();
  if (!obj || typeof obj !== "object") {
    throw new Error("RuntimeError: field access on non-object");
  }
  if (!(arg in obj.fields)) {
    throw new Error(`RuntimeError: unknown field '${arg}'`);
  }
  this.stack.push(obj.fields[arg]);
  break;
}

case "STORE_FIELD": {
  const value = this.stack.pop();
  const obj = this.stack.pop();
  if (!obj || typeof obj !== "object") {
    throw new Error("RuntimeError: field assignment on non-object");
  }
  if (!(arg in obj.fields)) {
    throw new Error(`RuntimeError: unknown field '${arg}'`);
  }
  obj.fields[arg] = value;
  break;
}




          /* ---------- ARRAYS ---------- */
          case "NEW_ARRAY": {
            const size = pop();
            this.resourceTracker.validateArrayLength(size);
            this.resourceTracker.allocateHeap(size * 8); // Assume 8 bytes per element
            const ref = heap.allocateArray(size);
            this.stack.push(ref);
            break;
          }

          case "ARRAY_GET": {
            const index = pop();
            const ref = pop();
            this.stack.push(heap.getArray(ref)[index]);
            break;
          }
case "STRING_CONCAT": {
  const b = pop();
  const a = pop();
  this.stack.push(String(a) + String(b));
  break;
}
case "STRING_EQUALS": {
  const b = pop();
  const a = pop();
  this.stack.push(a === b ? 1 : 0);
  break;
}

          case "ARRAY_SET": {
            const value = pop();
            const index = pop();
            const ref = pop();
            heap.getArray(ref)[index] = value;
            break;
          }

          case "ARRAY_LENGTH": {
            const ref = pop();
            const arr = heap.getArray(ref);
            if (!arr) {
              this.stack.push(0);
              break;
            }
            this.stack.push(arr.length);
            break;
          }

          /* ---------- ARITHMETIC ---------- */
          case "ADD": {
            const b = pop(), a = pop();
            this.stack.push(a + b);
            break;
          }

          case "SUB": {
            const b = pop(), a = pop();
            this.stack.push(a - b);
            break;
          }

          case "MUL": {
            const b = pop(), a = pop();
            this.stack.push(a * b);
            break;
          }

          case "DIV": {
            const b = pop(), a = pop();
            if (b === 0) throw ZeroDivisionErrorR("division by zero");
            this.stack.push(Math.floor(a / b));
            break;
          }

          case "MOD": {
            const b = pop(), a = pop();
            if (b === 0) throw ZeroDivisionErrorR("modulo by zero");
            this.stack.push(a % b);
            break;
          }

          /* ---------- COMPARISONS ---------- */
          case "GT": {
            const b = pop(), a = pop();
            this.stack.push(a > b ? 1 : 0);
            break;
          }

          case "LT": {
            const b = pop(), a = pop();
            this.stack.push(a < b ? 1 : 0);
            break;
          }

          case "GE": {
            const b = pop(), a = pop();
            this.stack.push(a >= b ? 1 : 0);
            break;
          }

          case "LE": {
            const b = pop(), a = pop();
            this.stack.push(a <= b ? 1 : 0);
            break;
          }

          case "EQ": {
            const b = pop(), a = pop();
            this.stack.push(a === b ? 1 : 0);
            break;
          }

          case "NE": {
            const b = pop(), a = pop();
            this.stack.push(a !== b ? 1 : 0);
            break;
          }

          /* ---------- CONTROL FLOW ---------- */
          case "JUMP":
            this.ip = arg;
            continue;
case "JUMP_IF_TRUE": {
  const cond = pop();
  if (cond) {
    this.ip = arg;
    continue;
  }
  break;
}

          case "JUMP_IF_FALSE": {
            const cond = pop();
            if (!cond) {
              this.ip = arg;
              continue;
            }
            break;
          }

          case "LABEL":
            break;

case "ENTER": {
  const argc = arg; // number of parameters
  const locals = {};

  // Pop arguments (right-to-left)
  for (let i = argc - 1; i >= 0; i--) {
    locals[`$${i}`] = this.stack.pop();
  }

  this.frames.push({locals});
  break;
}

             /* ---------- CALLS ---------- */
     case "CALL": {
  const { name, argc } = arg;

  if (this.labels[name] === undefined) {
    throw new RuntimeError("NameError", `unknown function '${name}'`);
  }

  // Track call frame
  this.resourceTracker.pushCallFrame();
  
  // DO NOT pop arguments here
  // ENTER will pop exactly argc
  this.callStack.push(this.ip + 1);
  this.ip = this.labels[name];
  continue;
}

// v2.9: Dynamic dispatch for virtual method calls
// v2.8: Constructor calls
case "CALL_CONSTRUCTOR": {
  const { className, argc } = arg;
  const label = `ctor_${className}`;
  
  if (this.labels[label] === undefined) {
    throw new RuntimeError("NameError", `unknown constructor '${label}'`);
  }
  
  this.callStack.push(this.ip + 1);
  this.ip = this.labels[label];
  continue;
}

// v2.9: Dynamic dispatch for virtual method calls
case "CALL_VIRTUAL": {
  const { methodName, className, argc, paramCount } = arg;
  
  // Get the receiver object (last argument)
  const receiver = this.stack[this.stack.length - argc];
  
  if (!receiver || typeof receiver !== "object" || !receiver.__class) {
    throw new RuntimeError("TypeError", "virtual method call on non-object");
  }
  
  // Find the actual class of the object
  const actualClass = receiver.__class;
  
  // Build method label - try actual class first, then fall back to declared class
  let label = null;
  
  // Try actual class with paramCount
  const label1 = `method_${actualClass}_${methodName}_${paramCount}`;
  const label2 = `method_${actualClass}_${methodName}`;
  
  if (this.labels[label1] !== undefined) {
    label = label1;
  } else if (this.labels[label2] !== undefined) {
    label = label2;
  } else {
    // Fall back to declared class
    const label3 = `method_${className}_${methodName}_${paramCount}`;
    const label4 = `method_${className}_${methodName}`;
    
    if (this.labels[label3] !== undefined) {
      label = label3;
    } else if (this.labels[label4] !== undefined) {
      label = label4;
    } else {
      throw new RuntimeError("NameError", `unknown virtual method '${methodName}'`);
    }
  }
  
  this.callStack.push(this.ip + 1);
  this.ip = this.labels[label];
  continue;
}


 /* ---------- RETURN ---------- */
          case "RETURN_VAL": {
  const ret = this.stack.pop();
  this.frames.pop();
  this.resourceTracker.popCallFrame();
  this.ip = this.callStack.pop();
  this.stack.push(ret);
  continue;
}

          /* ---------- HALT ---------- */
          case "HALT":
            return;

          default:
            throw new RuntimeError("RuntimeError", `unknown instruction ${op}`);
        }

        this.ip++;
      }
    } catch (e) {
      console.log(e.toString());
    }
  }
}

module.exports = VirtualMachine;
