// vm/vm.js
const readline = require("readline-sync");

// If your project has runtime/errors.js keep these requires.
// If not present, VM will still throw normal Error objects.
let RuntimeError = Error,
  TypeErrorR = (m) => new Error(m),
  IndexErrorR = (m) => new Error(m),
  ZeroDivisionErrorR = (m) => new Error(m);
try {
  const errs = require("../runtime/errors");
  RuntimeError = errs.RuntimeError || RuntimeError;
  TypeErrorR = errs.TypeErrorR || TypeErrorR;
  IndexErrorR = errs.IndexErrorR || IndexErrorR;
  ZeroDivisionErrorR = errs.ZeroDivisionErrorR || ZeroDivisionErrorR;
} catch (_) {}

class VirtualMachine {
  constructor(bytecode) {
    this.bytecode = bytecode;
    this.stack = [];
    this.frames = [];
    this.ip = 0;

    // Option 2 method table: className -> Map(methodName -> addr)
    this.classMethods = new Map();

    // v0.8 vtable table: className -> { baseName, slots, slotAddrs, dtorFuncName, dtorAddr }
    this.vtables = new Map();

    // v0.7 heap (Option B tagged pointers)
    // pointers are:
    //   null => null
    //   { __ptr: <positive int> } => heap address
    this.heap = new Map(); // addr -> object {__fields:[], __class/__struct, ...}
    this.freeList = []; // reusable addresses
    this.nextHeapId = 1;

    // frame ids for slot pointers ordering / diagnostics
    this.nextFrameId = 1;

    // --- optional debug / diagnostics
    this.debugTrace = false; // set true to log each instruction
    this.debugStack = false; // set true to log stack ops
    this.debugHeap = false; // set true to log heap events
    this.warnLeaks = true; // warn if heap not empty on HALT
    this.heapAllocs = 0;
    this.heapFrees = 0;
    this.tombstones = new Map(); // addr -> { tag, freedAt }
    this.steps = 0;
    this.MAX_STEPS = 10_000_000;

    // v0.9 exceptions
    this.handlers = []; // stack of { frame, stackDepth, catchAddr, catchType, catchVar }

    // v0.9 exception polish: rethrow support
    this._excStack = [];
    this._pendingCaught = null; // set by THROW before jumping to catch

    // Optional GC (VM-only). Enable with environment VM_GC=1
    this.enableGC = String(process.env.VM_GC || "").toLowerCase() === "1";
    this._allocSinceGC = 0;
  }

  currentFrame() {
    return this.frames[this.frames.length - 1];
  }

  buildMethodTable() {
    for (let i = 0; i < this.bytecode.length; i++) {
      const ins = this.bytecode[i];
      if (!ins) continue;
      if (ins[0] !== "DEF_METHOD") continue;

      const className = ins[1];
      const methodName = ins[2];
      const addr = ins[3];

      if (!this.classMethods.has(className)) this.classMethods.set(className, new Map());
      // Special marker: null addr with __dummy__ method means just register the class
      if (addr === null && methodName === "__dummy__") {
        // Just register the class, don't add the dummy method
        continue;
      }
      this.classMethods.get(className).set(methodName, addr);
    }
  }

  buildVTableTable() {
    for (let i = 0; i < this.bytecode.length; i++) {
      const ins = this.bytecode[i];
      if (!ins) continue;
      if (ins[0] !== "DEF_VTABLE") continue;

      // ["DEF_VTABLE", { className, baseName, slots, slotAddrs, dtorFuncName, dtorAddr }]
      const info = ins[1] || {};
      const className = info.className ?? null;
      if (!className) continue;

      this.vtables.set(className, {
        className,
        baseName: info.baseName ?? null,
        slots: Array.isArray(info.slots) ? info.slots : [],
        slotAddrs: Array.isArray(info.slotAddrs) ? info.slotAddrs : [],
        dtorFuncName: info.dtorFuncName ?? null,
        dtorAddr: info.dtorAddr ?? null,
      });
    }
  }

  // ---- exceptions helpers (v0.9) ----
  isSubclass(child, parent) {
    if (child === parent) return true;
    let cur = child;
    const seen = new Set();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const vt = this.vtables.get(cur);
      if (!vt) break;
      cur = vt.baseName;
      if (cur === parent) return true;
    }
    return false;
  }

  typeTagForException(v) {
    if (this.isPtr(v)) {
      const id = this.ptrId(v, "exception");
      if (id === null) return { kind: "prim", name: "null" };
      if (id && typeof id === "object") return { kind: "ptr", name: null };
      const obj = this.heap.get(id);
      if (obj && obj.__class) return { kind: "classptr", name: obj.__class };
      if (obj && obj.__struct) return { kind: "structptr", name: obj.__struct };
      return { kind: "ptr", name: null };
    }
    if (v === null) return { kind: "prim", name: "null" };
    if (Array.isArray(v)) return { kind: "prim", name: "list" };
    switch (typeof v) {
      case "number":
        return { kind: "prim", name: Number.isInteger(v) ? "int" : "float" };
      case "boolean":
        return { kind: "prim", name: "bool" };
      case "string":
        return { kind: "prim", name: "string" };
      default:
        return { kind: "prim", name: typeof v };
    }
  }

  handlerMatches(thrownTag, catchType) {
    // null/unknown catch type means catch-all
    if (!catchType || typeof catchType !== "object") return true;

    if (catchType.kind === "prim") {
      return thrownTag.kind === "prim" && thrownTag.name === catchType.name;
    }

    if (catchType.kind === "ptr") {
      return thrownTag.kind === "classptr" || thrownTag.kind === "structptr" || thrownTag.kind === "ptr";
    }

    if (catchType.kind === "classptr") {
      if (thrownTag.kind !== "classptr") return false;
      if (catchType.name == null) return true;
      if (thrownTag.name == null) return true;
      return this.isSubclass(thrownTag.name, catchType.name);
    }

    if (catchType.kind === "structptr") {
      if (thrownTag.kind !== "structptr") return false;
      if (catchType.name == null) return true;
      if (thrownTag.name == null) return true;
      return thrownTag.name === catchType.name;
    }

    return false;
  }

  // ---- pointer helpers (Option B tagged pointers) ----
  isPtr(v) {
    return !!(v && typeof v === "object" && v.__ptr != null);
  }


  // pointer-like includes: null, legacy numeric pointers, and tagged pointers
  isPtrLike(v) {
    // IMPORTANT:
    // Treating *all integers* as pointer-like breaks normal integer comparisons
    // (e.g., 10 > 5 would take the pointer ordering path).
    //
    // In this VM, "real" pointers should be represented as tagged pointer objects
    // (via mkPtr/mkSlotPtr/mkFieldPtr). Keep null as pointer-like for NULL.
    if (v === null) return true;
    return this.isPtr(v);
  }

  // Produce a stable ordering key for any pointer-like value.
  // This intentionally defines a total order even where C++ would call it unspecified/undefined;
  // it is needed for std::less / ordered containers in the stdlib tests.
  ptrOrderKey(v) {
    const id = this.ptrId(v, "pointer");
    if (id === null) return "P:null";
    if (typeof id === "number") return `P:heap:${id}`;

    // slot pointer: { kind:"slot", frame, name }
    if (id && typeof id === "object" && id.kind === "slot") {
      const fid = (id.frame && typeof id.frame.__fid === "number") ? id.frame.__fid : 0;
      return `P:slot:${fid}:${id.name}`;
    }

    // field pointer: { kind:"field", base:<ptrVal>, offset:<int> }
    if (id && typeof id === "object" && id.kind === "field") {
      const baseKey = this.ptrOrderKey(id.base);
      const off = Number.isFinite(id.offset) ? id.offset : 0;
      return `P:field:${baseKey}:${off}`;
    }

    // Fallback (should be unreachable due to ptrId checks)
    return "P:unknown";
  }

  mkPtr(id) {
    return { __ptr: id };
  }

  ptrId(v, context = "pointer") {
    // Accept:
    //  - null
    //  - legacy numeric pointers (v0.7): 0 => null, >0 => heap addr
    //  - tagged pointers: { __ptr: <positive int> } for heap
    //  - extended tagged pointers for references:
    //      { __ptr: { kind: "slot", frame: <frame>, name: <string> } }
    //      { __ptr: { kind: "field", base: <ptrVal>, offset: <int> } }
    if (v === null) return null;

    if (typeof v === "number" && Number.isFinite(v) && Number.isInteger(v)) {
      if (v === 0) return null;
      if (v > 0) return v;
      throw TypeErrorR(`${context} has invalid numeric pointer`);
    }

    if (!this.isPtr(v)) throw TypeErrorR(`${context} must be a pointer or null`);
    const id = v.__ptr;

    if (typeof id === "number") {
      if (!Number.isInteger(id) || id <= 0) throw TypeErrorR(`${context} has invalid pointer id`);
      return id;
    }

    if (id && typeof id === "object") {
      if (id.kind === "slot") {
        if (!id.frame || typeof id.name !== "string") throw TypeErrorR(`${context} has invalid slot pointer`);
        return id;
      }
      if (id.kind === "field") {
        if (typeof id.offset !== "number") throw TypeErrorR(`${context} has invalid field pointer`);
        return id;
      }
      throw TypeErrorR(`${context} has invalid pointer kind`);
    }

    throw TypeErrorR(`${context} has invalid pointer`);
  }

  mkSlotPtr(frame, name) {
    return { __ptr: { kind: "slot", frame, name } };
  }

  mkFieldPtr(basePtrVal, offset) {
    return { __ptr: { kind: "field", base: basePtrVal, offset } };
  }

  // ---- heap helpers ----
  allocHeapObject(obj) {
    let addr;
    if (this.freeList.length > 0) addr = this.freeList.pop();
    else addr = this.nextHeapId++;
    this.heap.set(addr, obj);
    this.heapAllocs++;
    this._allocSinceGC++;
    if (this.enableGC && this._allocSinceGC >= 2000) {
      this._allocSinceGC = 0;
      this.collectGarbage();
    }
    if (this.debugHeap) {
      const tag = obj.__class ? `class:${obj.__class}` : `struct:${obj.__struct}`;
      console.log(`[heap] alloc addr=${addr} ${tag} fields=${obj.__fields?.length ?? 0}`);
    }
    return addr;
  }

  // -----------------------------
  // Optional GC (VM-only): simple mark/sweep over heap objects
  // -----------------------------
  collectGarbage() {
    // Mark phase
    const marked = new Set();
    const work = [];

    const pushPtr = (v) => {
      if (!this.isPtr(v)) return;
      const id = v.__ptr;
      if (typeof id === "number" && this.heap.has(id) && !marked.has(id)) {
        marked.add(id);
        work.push(id);
      }
    };

    // Roots: stack values
    for (const v of this.stack) pushPtr(v);

    // Roots: frame locals
    for (const fr of this.frames) {
      if (!fr || !fr.locals) continue;
      for (const k of Object.keys(fr.locals)) pushPtr(fr.locals[k]);
    }

    // Roots: pending caught / exception stack
    if (this._pendingCaught != null) pushPtr(this._pendingCaught);
    for (const ex of this._excStack) pushPtr(ex);

    // Traverse heap graph
    while (work.length > 0) {
      const id = work.pop();
      const obj = this.heap.get(id);
      if (!obj || !Array.isArray(obj.__fields)) continue;
      for (const f of obj.__fields) pushPtr(f);
    }

    // Sweep phase
    const toFree = [];
    for (const [id] of this.heap) {
      if (!marked.has(id)) toFree.push(id);
    }
    for (const id of toFree) {
      const obj = this.heap.get(id);
      this.heap.delete(id);
      this.freeList.push(id);
      this.heapFrees++;
      const tag = obj && (obj.__class ? `class:${obj.__class}` : `struct:${obj.__struct}`);
      this.tombstones.set(id, { tag: tag || "unknown", freedAt: this.steps });
    }
  }

  expectPtr(v, context = "pointer") {
    return this.ptrId(v, context);
  }

  derefPtr(ptr, context = "dereference") {
    const id = this.expectPtr(ptr, "pointer");
    if (id === null) throw new RuntimeError("RuntimeError", `null pointer ${context}`);

    // slot pointer (stack frame local)
    if (id && typeof id === 'object' && id.kind === 'slot') {
      const frame = id.frame;
      if (!frame.__alive) {
        throw new RuntimeError("RuntimeError", `dangling reference to '${id.name}' during ${context}`);
      }
      return frame.locals[id.name];
    }

    // field pointer (base pointer + offset)
    if (id && typeof id === 'object' && id.kind === 'field') {
      const baseObj = this.derefPtr(id.base, context);
      if (!baseObj || typeof baseObj !== 'object' || !Array.isArray(baseObj.__fields)) {
        throw new RuntimeError("RuntimeError", `invalid field base during ${context}`);
      }
      return baseObj.__fields[id.offset];
    }

    // heap pointer
    // Handle pointer arithmetic on vector data pointers
    // If id doesn't exist in heap, check if it's a result of pointer arithmetic on vector data
    let obj = this.heap.get(id);
    if (!obj) {
      // Check if this is pointer arithmetic result on vector data
      // Try to find the base vector data object
      for (const [addr, heapObj] of this.heap.entries()) {
        if (heapObj && heapObj.__class === "vector_data" && heapObj.__baseAddr) {
          const baseAddr = heapObj.__baseAddr;
          const offset = id - baseAddr;
          if (offset >= 0 && offset < heapObj.__fields.length) {
            // This is a valid offset into vector data - return the element
            return heapObj.__fields[offset];
          }
        }
      }
      const ts = this.tombstones.get(id);
      if (ts) {
        throw new RuntimeError(
          "RuntimeError",
          `use-after-free: pointer ${id} (${ts.tag}) during ${context}`
        );
      }
      throw new RuntimeError("RuntimeError", `invalid pointer ${id} during ${context}`);
    }
    // If this is a vector_data object, we need to return the first element, not the object
    if (obj.__class === "vector_data" && Array.isArray(obj.__fields) && obj.__fields.length > 0) {
      return obj.__fields[0];
    }
    return obj;
  }

  storeThroughPtr(ptr, value, context = 'store') {
    const id = this.expectPtr(ptr, 'pointer');
    if (id === null) throw new RuntimeError('RuntimeError', `null pointer ${context}`);

    if (id && typeof id === 'object' && id.kind === 'slot') {
      const frame = id.frame;
      if (!frame.__alive) {
        throw new RuntimeError('RuntimeError', `dangling reference to '${id.name}' during ${context}`);
      }
      frame.locals[id.name] = value;
      return;
    }

    if (id && typeof id === 'object' && id.kind === 'field') {
      const baseObj = this.derefPtr(id.base, context);
      if (!baseObj || typeof baseObj !== 'object' || !Array.isArray(baseObj.__fields)) {
        throw new RuntimeError('RuntimeError', `invalid field base during ${context}`);
      }
      baseObj.__fields[id.offset] = value;
      return;
    }

    // heap pointer to scalar/object root is not writable with STORE_PTR (use STORE_PTR_FIELD)
    throw new RuntimeError('RuntimeError', `STORE_PTR expects a reference pointer, got heap pointer ${id}`);
  }

  freePtr(ptr) {
    const id = this.expectPtr(ptr, "pointer");
    if (id === null) return; // delete null is no-op

    if (id && typeof id === 'object') {
      throw new RuntimeError('RuntimeError', 'cannot delete non-heap pointer');
    }

    if (!this.heap.has(id)) {
      const ts = this.tombstones ? this.tombstones.get(id) : null;
      if (ts) {
        throw new RuntimeError("RuntimeError", `double free: pointer ${id} (${ts.tag})`);
      }
      throw new RuntimeError("RuntimeError", `free of invalid pointer ${id}`);
    }
    const obj = this.heap.get(id);
    const tag = obj && obj.__class ? `class:${obj.__class}` : `struct:${obj?.__struct}`;
    this.heap.delete(id);
    this.heapFrees++;
    this.freeList.push(id);
    if (this.tombstones) {
      this.tombstones.set(id, { tag, freedAt: this.stepCount });
    }
    if (this.debugHeap) {
      console.log(`[heap] free addr=${id} ${tag}`);
    }
  }

  // v0.8 helper: resolve an object's dynamic class for vtable lookup
  getDynamicClassName(obj) {
    // prefer __class, fall back to __vtableClass if present, then __struct (no vtables for structs)
    const cn = obj && typeof obj === "object" ? (obj.__class ?? obj.__vtableClass ?? null) : null;
    return cn;
  }

  resolveVTableForObject(obj) {
    const className = this.getDynamicClassName(obj);
    if (!className) throw new RuntimeError("RuntimeError", "object has no class for vtable lookup");

    const vt = this.vtables.get(className);
    if (!vt) throw new RuntimeError("RuntimeError", `no vtable registered for class '${className}'`);
    return vt;
  }


  // -------------------------
  // v0.8.1: delete/destructor helpers
  // -------------------------
  buildDeleteChain(dynamicClassName) {
    const chain = [];
    let cur = dynamicClassName;
    const seen = new Set();
    while (cur) {
      if (seen.has(cur)) break;
      seen.add(cur);
      chain.push(cur);
      const vt = this.vtables.get(cur);
      if (!vt || !vt.baseName) break;
      cur = vt.baseName;
    }
    return chain;
  }

  // Start (or continue) a delete sequence. Runs destructor(s) most-derived -> base, then frees.
  _beginDelete(ptrVal, originIp) {
    const id = this.expectPtr(ptrVal, 'pointer');
    if (id === null) {
      this.ip = originIp;
      return;
    }
    const obj = this.derefPtr(ptrVal, 'delete');

    // structs have no destructors
    if (!obj || typeof obj !== 'object' || !obj.__class) {
      this.freePtr(ptrVal);
      this.ip = originIp;
      return;
    }

    const dyn = this.getDynamicClassName(obj);
    const chain = this.buildDeleteChain(dyn);
    this._continueDelete({ ptrVal, originIp, obj, chain, nextIndex: 0 });
  }

  _continueDelete(state) {
    // advance to next destructor that exists
    while (state.nextIndex < state.chain.length) {
      const cn = state.chain[state.nextIndex++];
      const vt = this.vtables.get(cn);
      const addr = vt ? vt.dtorAddr : null;
      if (addr != null) {
        // Call destructor like a normal function with $arg0 = receiver object.
        // When it returns, RETURN handler will resume the delete sequence.
        this.frames.push({ returnIp: state.originIp, locals: {}, __deleteState: state, __alive: true, __fid: this.nextFrameId++ });
        const nf = this.currentFrame();
        nf.locals['$arg0'] = state.obj;
        this.ip = addr;
        return;
      }
    }

    // No more destructors; now free.
    this.freePtr(state.ptrVal);
    this.ip = state.originIp;
  }

  // -----------------------------
  // v0.9 continuation: stack-object destructors on return/unwind
  // Frame stores __dtors as array of { obj, className } in registration order.
  // We run them in reverse registration order.
  // -----------------------------
  _beginFrameDtors(dtors, resume) {
    if (!dtors || dtors.length === 0) {
      this._resumeAfterDtors(resume);
      return;
    }
    const state = {
      dtors,
      itemIndex: dtors.length - 1,
      chain: null,
      chainIndex: 0,
      obj: null,
      resume,
    };
    this._continueFrameDtors(state);
  }

  _continueFrameDtors(state) {
    while (true) {
      if (state.chain && state.chainIndex < state.chain.length) {
        const cn = state.chain[state.chainIndex++];
        const vt = this.vtables.get(cn);
        const addr = vt ? vt.dtorAddr : null;
        if (addr != null) {
          // Push a synthetic frame; when RETURN happens, we'll resume dtors.
          this.frames.push({ returnIp: -2, locals: {}, __frameDtorState: state, __alive: true, __fid: this.nextFrameId++ });
          const nf = this.currentFrame();
          nf.locals['$arg0'] = state.obj;
          this.ip = addr;
          return;
        }
        continue;
      }

      // Move to next object
      if (state.itemIndex < 0) {
        this._resumeAfterDtors(state.resume);
        return;
      }
      const item = state.dtors[state.itemIndex--];
      state.obj = item.obj;
      const dyn = this.getDynamicClassName(state.obj) || item.className;
      state.chain = this.buildDeleteChain(dyn);
      state.chainIndex = 0;
    }
  }

  _resumeAfterDtors(resume) {
    if (!resume) {
      this.ip++;
      return;
    }
    if (resume.kind === 'return') {
      if (resume.hasRetVal) this.stack.push(resume.retVal);
      if (resume.retIp === -1) return;
      this.ip = resume.retIp;
      return;
    }
    if (resume.kind === 'throw') {
      // restore stack depth and continue exception handling from stored state
      this.stack.length = resume.stackDepth;
      const exVal = resume.exVal;
      const thrownTag = resume.thrownTag;
      // Continue searching handlers already stored in resume.handlers (a stack)
      this.handlers = resume.handlers;
      // Run handler search logic like THROW
      while (true) {
        if (this.handlers.length === 0) {
          throw new RuntimeError('RuntimeError', 'Uncaught exception');
        }
        const h = this.handlers.pop();
        // Unwind frames until handler frame, running dtors along the way.
        if (this._unwindFramesTo(h.frame, { exVal, thrownTag, h })) {
          // dtors are running; we'll resume from frame dtor logic
          return;
        }
        // Stack already set by _unwindFramesTo
        if (this.handlerMatches(thrownTag, h.catchType)) {
          if (h.catchVar != null) h.frame.locals[h.catchVar] = exVal;
          this._pendingCaught = exVal;
          this.ip = h.catchAddr;
          return;
        }
      }
    }
  }

  _unwindFramesTo(targetFrame, throwCtx) {
    // Returns true if it started running dtors asynchronously.
    while (this.frames.length > 0 && this.currentFrame() !== targetFrame) {
      const fr = this.currentFrame();
      const dt = fr.__dtors || [];
      fr.__alive = false;
      this.frames.pop();
      if (dt.length > 0) {
        // Run dtors, then resume throw from this point.
        const resume = {
          kind: 'throw',
          exVal: throwCtx.exVal,
          thrownTag: throwCtx.thrownTag,
          stackDepth: throwCtx.h.stackDepth,
          handlers: this.handlers.slice(),
        };
        // We must also keep the current handler info (already popped) and continue from there.
        // Put it back onto handlers so the resume search includes it first.
        resume.handlers.push(throwCtx.h);
        // Start dtors and pause.
        this._beginFrameDtors(dt, resume);
        return true;
      }
    }
    // successful synchronous unwind; reset stack to handler depth
    this.stack.length = throwCtx.h.stackDepth;
    return false;
  }

  run() {
    const pop = () => {
      if (this.stack.length === 0) throw new RuntimeError("RuntimeError", "stack underflow");
      return this.stack.pop();
    };

    // ── Helper: runtime printf-style formatter ──────────────────────────────
    const _vmFormatString = (fmt, args) => {
      let out = "", ai = 0, i = 0;
      while (i < fmt.length) {
        if (fmt[i] !== "%") { out += fmt[i++]; continue; }
        const specStart = i;
        i++;
        // flags
        while (i < fmt.length && "-+ 0#".includes(fmt[i])) i++;
        // width
        let width = 0;
        while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") { width = width*10 + parseInt(fmt[i++]); }
        // precision
        let prec = -1;
        if (i < fmt.length && fmt[i] === ".") {
          i++; prec = 0;
          while (i < fmt.length && fmt[i] >= "0" && fmt[i] <= "9") { prec = prec*10 + parseInt(fmt[i++]); }
        }
        // length modifier
        while (i < fmt.length && "lhLzqjt".includes(fmt[i])) i++;
        if (i >= fmt.length) break;
        const spec = fmt[i++];
        if (spec === "%") { out += "%"; continue; }
        if (spec === "n") { ai++; continue; }
        const v = args[ai++];
        if      (spec === "d" || spec === "i") out += Math.trunc(Number(v) || 0);
        else if (spec === "u")                 out += Math.abs(Math.trunc(Number(v) || 0));
        else if (spec === "f" || spec === "F") out += (Number(v) || 0).toFixed(prec < 0 ? 6 : prec);
        else if (spec === "e" || spec === "E") out += (Number(v) || 0).toExponential(prec < 0 ? 6 : prec);
        else if (spec === "g" || spec === "G") {
          const p = prec < 0 ? 6 : prec;
          out += (Number(v) || 0).toPrecision(Math.max(1, p)).replace(/\.?0+$/, "");
        }
        else if (spec === "c")                 out += typeof v === "number" ? String.fromCharCode(v) : String(v)[0] || "";
        else if (spec === "s")                 out += v === null ? "(null)" : String(v);
        else if (spec === "x")                 out += Math.trunc(Number(v) || 0).toString(16);
        else if (spec === "X")                 out += Math.trunc(Number(v) || 0).toString(16).toUpperCase();
        else if (spec === "o")                 out += Math.trunc(Number(v) || 0).toString(8);
        else if (spec === "p")                 out += `0x${(Number(v)||0).toString(16)}`;
        else                                   out += String(v);
      }
      return out;
    };

    const resolveVar = (name) => {
      const frame = this.currentFrame();
      if (name in frame.locals) return frame.locals[name];
      const globalFrame = this.frames[0];
      if (name in globalFrame.locals) return globalFrame.locals[name];
      throw new RuntimeError("NameError", `name '${name}' is not defined`);
    };

    // global frame
    this.frames.push({ returnIp: -1, locals: {}, __alive: true, __fid: this.nextFrameId++ });

    // pre-scan methods + vtables
    this.buildMethodTable();
    this.buildVTableTable();

    while (this.ip < this.bytecode.length) {
      this.steps++;
      if (this.steps > this.MAX_STEPS)
        throw new RuntimeError("RuntimeError", "execution step limit exceeded");

      const ins = this.bytecode[this.ip];
      const op = ins[0];
      const a = ins[1];
      const b = ins[2];
      const c = ins[3];

      if (this.debugTrace) {
        console.log(`[ip=${this.ip}] ${op}`, a ?? "", b ?? "", c ?? "");
      }

      const frame = this.currentFrame();
      const vars = frame.locals;

      switch (op) {
        // --- meta
        case "DEF_METHOD":
          // already scanned; skip at runtime
          this.ip++;
          break;

        case "DEF_VTABLE":
          // already scanned; skip at runtime
          this.ip++;
          break;

        // --- const/vars
        case "LOAD_CONST":
          this.stack.push(a);
          this.ip++;
          break;

        case "LOAD_VAR":
          this.stack.push(resolveVar(a));
          this.ip++;
          break;

        case "STORE_VAR":
          vars[a] = pop();
          this.ip++;
          break;

        case "REGISTER_DTOR": {
          const info = a || {};
          const name = info.var;
          const className = info.className;
          if (typeof name !== "string" || !name) {
            this.ip++;
            break;
          }
          const obj = resolveVar(name);
          if (!frame.__dtors) frame.__dtors = [];
          frame.__dtors.push({ obj, className });
          this.ip++;
          break;
        }

        case "POP":
          pop();
          this.ip++;
          break;

        // --- cast
        case "I2F": {
          const x = pop();
          if (typeof x !== "number" || !Number.isInteger(x)) throw TypeErrorR("I2F expects int");
          this.stack.push(x * 1.0);
          this.ip++;
          break;
        }

        case "F2I": {
          const x = pop();
          if (typeof x !== "number") throw TypeErrorR("F2I expects float");
          // Truncate toward zero (C-like cast).
          this.stack.push(x < 0 ? Math.ceil(x) : Math.floor(x));
          this.ip++;
          break;
        }

        // --- arithmetic
        case "ADD": {
          const y = pop(),
            x = pop();
          // pointer arithmetic support for raw numeric pointers (heap ids):
          //   ptr + int  => ptr
          //   int + ptr  => ptr
          // For non-numeric pointer kinds (slot/field), arithmetic is not supported.
          const xIsPtr = this.isPtr(x);
          const yIsPtr = this.isPtr(y);

          if (xIsPtr && typeof y === "number" && Number.isInteger(y)) {
            const id = this.ptrId(x, "pointer");
            if (typeof id === "number") {
              this.stack.push(this.mkPtr(id + y));
            } else if (id && id.kind === "field") {
              const newPtr = this.mkFieldPtr(id.base, id.offset + y);
              this.stack.push(newPtr);
            } else {
              throw TypeErrorR("unsupported pointer arithmetic for reference pointers");
            }
            this.ip++;
            break;
          }
          if (yIsPtr && typeof x === "number" && Number.isInteger(x)) {
            const id = this.ptrId(y, "pointer");
            if (typeof id === "number") {
              this.stack.push(this.mkPtr(id + x));
            } else if (id && id.kind === "field") {
              this.stack.push(this.mkFieldPtr(id.base, id.offset + x));
            } else {
              throw TypeErrorR("unsupported pointer arithmetic for reference pointers");
            }
            this.ip++;
            break;
          }

          if (typeof x !== "number" || typeof y !== "number") throw TypeErrorR("unsupported operand type(s) for +");
          this.stack.push(x + y);
          this.ip++;
          break;
        }
        case "SUB": {
          const y = pop(),
            x = pop();
          const xIsPtr = this.isPtr(x);
          const yIsPtr = this.isPtr(y);

          if (xIsPtr && typeof y === "number" && Number.isInteger(y)) {
            const id = this.ptrId(x, "pointer");
            if (typeof id === "number") {
              this.stack.push(this.mkPtr(id - y));
            } else if (id && id.kind === "field") {
              this.stack.push(this.mkFieldPtr(id.base, id.offset - y));
            } else {
              throw TypeErrorR("unsupported pointer arithmetic for reference pointers");
            }
            this.ip++;
            break;
          }

          // ptr - ptr => int (difference of raw ids)
          if (xIsPtr && yIsPtr) {
            const xid = this.ptrId(x, "pointer");
            const yid = this.ptrId(y, "pointer");
            if (typeof xid === "number" && typeof yid === "number") {
              this.stack.push(xid - yid);
            } else if (xid && xid.kind === "field" && yid && yid.kind === "field") {
               const kx = this.ptrOrderKey(xid.base);
               const ky = this.ptrOrderKey(yid.base);
               if (kx !== ky) throw TypeErrorR("pointer subtraction with different bases");
               this.stack.push(xid.offset - yid.offset);
            } else {
              throw TypeErrorR("unsupported pointer subtraction for reference pointers");
            }
            this.ip++;
            break;
          }

          if (typeof x !== "number" || typeof y !== "number") throw TypeErrorR("unsupported operand type(s) for -");
          this.stack.push(x - y);
          this.ip++;
          break;
        }
        case "MUL": {
          const y = pop(),
            x = pop();
          if (typeof x !== "number" || typeof y !== "number")
            throw TypeErrorR("unsupported operand type(s) for *");
          this.stack.push(x * y);
          this.ip++;
          break;
        }
        case "DIV": {
          const y = pop(),
            x = pop();
          if (typeof x !== "number" || typeof y !== "number")
            throw TypeErrorR("unsupported operand type(s) for /");
          if (y === 0) throw ZeroDivisionErrorR("division by zero");
          this.stack.push(x / y);
          this.ip++;
          break;
        }
        case "IDIV": {
          const y = pop(),
            x = pop();
          if (typeof x !== "number" || typeof y !== "number")
            throw TypeErrorR("unsupported operand type(s) for //");
          if (y === 0) throw ZeroDivisionErrorR("integer division by zero");
          this.stack.push(Math.trunc(x / y));
          this.ip++;
          break;
        }
        case "MOD": {
          const y = pop(),
            x = pop();
          if (typeof x !== "number" || typeof y !== "number")
            throw TypeErrorR("unsupported operand type(s) for %");
          if (y === 0) throw ZeroDivisionErrorR("modulo by zero");
          this.stack.push(x % y);
          this.ip++;
          break;
        }
        case "NEG": {
          const x = pop();
          if (typeof x !== "number") throw TypeErrorR("bad operand type for unary -");
          this.stack.push(-x);
          this.ip++;
          break;
        }

        // --- comparisons
        case "COMPARE_EQ": {
          const y = pop(),
            x = pop();

          const xIsPtr = this.isPtr(x);
          const yIsPtr = this.isPtr(y);

          if (x === null || y === null || xIsPtr || yIsPtr) {
            if (x === null && y === null) this.stack.push(true);
            else if (xIsPtr && yIsPtr) {
              const kx = this.ptrOrderKey(x);
              const ky = this.ptrOrderKey(y);
              this.stack.push(kx === ky);
            }
            else this.stack.push(false);
            this.ip++;
            break;
          }

          this.stack.push(x === y);
          this.ip++;
          break;
        }
        case "COMPARE_NE": {
          const y = pop(),
            x = pop();

          const xIsPtr = this.isPtr(x);
          const yIsPtr = this.isPtr(y);

          if (x === null || y === null || xIsPtr || yIsPtr) {
            if (x === null && y === null) this.stack.push(false);
            else if (xIsPtr && yIsPtr) {
              const kx = this.ptrOrderKey(x);
              const ky = this.ptrOrderKey(y);
              this.stack.push(kx !== ky);
            }
            else this.stack.push(true);
            this.ip++;
            break;
          }

          this.stack.push(x !== y);
          this.ip++;
          break;
        }
        case "COMPARE_LT": {
          const y = pop(),
            x = pop();

          const xPtr = this.isPtrLike(x);
          const yPtr = this.isPtrLike(y);

          // pointer-like total ordering (needed for std::less, ordered maps, etc.)
          if (xPtr || yPtr) {
            if (!(xPtr && yPtr))
              throw TypeErrorR("unsupported operand type(s) for pointer comparison");
            const kx = this.ptrOrderKey(x);
            const ky = this.ptrOrderKey(y);
            this.stack.push(kx < ky ? 1 : 0);
            this.ip++;
            break;
          }

          this.stack.push(x < y);
          this.ip++;
          break;
        }
        case "COMPARE_GT": {
          const y = pop(),
            x = pop();

          const xPtr = this.isPtrLike(x);
          const yPtr = this.isPtrLike(y);

          if (xPtr || yPtr) {
            if (!(xPtr && yPtr))
              throw TypeErrorR("unsupported operand type(s) for pointer comparison");
            const kx = this.ptrOrderKey(x);
            const ky = this.ptrOrderKey(y);
            this.stack.push(kx > ky ? 1 : 0);
            this.ip++;
            break;
          }

          this.stack.push(x > y);
          this.ip++;
          break;
        }
        case "COMPARE_LE": {
          const y = pop(),
            x = pop();

          const xPtr = this.isPtrLike(x);
          const yPtr = this.isPtrLike(y);

          if (xPtr || yPtr) {
            if (!(xPtr && yPtr))
              throw TypeErrorR("unsupported operand type(s) for pointer comparison");
            const kx = this.ptrOrderKey(x);
            const ky = this.ptrOrderKey(y);
            this.stack.push(kx <= ky);
            this.ip++;
            break;
          }

          this.stack.push(x <= y);
          this.ip++;
          break;
        }
        case "COMPARE_GE": {
          const y = pop(),
            x = pop();

          const xPtr = this.isPtrLike(x);
          const yPtr = this.isPtrLike(y);

          if (xPtr || yPtr) {
            if (!(xPtr && yPtr))
              throw TypeErrorR("unsupported operand type(s) for pointer comparison");
            const kx = this.ptrOrderKey(x);
            const ky = this.ptrOrderKey(y);
            this.stack.push(kx >= ky);
            this.ip++;
            break;
          }

          this.stack.push(x >= y);
          this.ip++;
          break;
        }

        // --- boolean
        case "AND": {
          const y = pop(),
            x = pop();
          this.stack.push(Boolean(x) && Boolean(y));
          this.ip++;
          break;
        }
        case "OR": {
          const y = pop(),
            x = pop();
          this.stack.push(Boolean(x) || Boolean(y));
          this.ip++;
          break;
        }
        case "NOT": {
          const x = pop();
          this.stack.push(!Boolean(x));
          this.ip++;
          break;
        }

        // --- bitwise operations ---
        case "BIT_AND": {
          const y = pop();
          const x = pop();
          if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
            throw TypeErrorR("BIT_AND requires integer operands");
          }
          this.stack.push(x & y);
          this.ip++;
          break;
        }
        case "BIT_OR": {
          const y = pop();
          const x = pop();
          if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
            throw TypeErrorR("BIT_OR requires integer operands");
          }
          this.stack.push(x | y);
          this.ip++;
          break;
        }
        case "BIT_XOR": {
          const y = pop();
          const x = pop();
          if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
            throw TypeErrorR("BIT_XOR requires integer operands");
          }
          this.stack.push(x ^ y);
          this.ip++;
          break;
        }
        case "BIT_NOT": {
          const x = pop();
          if (typeof x !== "number" || !Number.isInteger(x)) {
            throw TypeErrorR("BIT_NOT requires integer operand");
          }
          this.stack.push(~x);
          this.ip++;
          break;
        }
        case "SHL": {
          const y = pop();
          const x = pop();
          if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
            throw TypeErrorR("SHL requires integer operands");
          }
          this.stack.push(x << y);
          this.ip++;
          break;
        }
        case "SHR": {
          const y = pop();
          const x = pop();
          if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
            throw TypeErrorR("SHR requires integer operands");
          }
          this.stack.push(x >> y);
          this.ip++;
          break;
        }

        // ---- exceptions (v0.9) ----
        case "PUSH_HANDLER": {
          const info = a || {};
          this.handlers.push({
            frame: this.currentFrame(),
            stackDepth: this.stack.length,
            catchAddr: info.catchAddr,
            catchType: info.catchType,
            catchVar: info.catchVar,
          });
          this.ip++;
          break;
        }

        case "POP_HANDLER": {
          if (this.handlers.length > 0) this.handlers.pop();
          this.ip++;
          break;
        }

        case "THROW": {
          const exVal = pop();
          const thrownTag = this.typeTagForException(exVal);

          while (true) {
            if (this.handlers.length === 0) {
              throw new RuntimeError("RuntimeError", "Uncaught exception");
            }

            const h = this.handlers.pop();

            // unwind frames until we reach handler frame, running registered dtors
            if (this._unwindFramesTo(h.frame, { exVal, thrownTag, h })) {
              // dtors started; we'll resume throw from the dtor continuation
              break;
            }

            if (this.handlerMatches(thrownTag, h.catchType)) {
              if (h.catchVar != null) {
                h.frame.locals[h.catchVar] = exVal;
              }
              // stash the caught exception; ENTER_CATCH will push it on the rethrow stack
              this._pendingCaught = exVal;
              this.ip = h.catchAddr;
              break;
            }
          }
          break;
        }

        case "ENTER_CATCH": {
          // begin catch scope: enable 'throw;' (rethrow)
          this._excStack.push(this._pendingCaught);
          this._pendingCaught = null;
          this.ip++;
          break;
        }

        case "LEAVE_CATCH": {
          if (this._excStack.length > 0) this._excStack.pop();
          this.ip++;
          break;
        }

        case "RETHROW": {
          if (this._excStack.length === 0) {
            throw new RuntimeError("RuntimeError", "RETHROW with no active catch");
          }
          const exVal = this._excStack[this._excStack.length - 1];
          const thrownTag = this.typeTagForException(exVal);

          while (true) {
            if (this.handlers.length === 0) {
              throw new RuntimeError("RuntimeError", "Uncaught exception");
            }
            const h = this.handlers.pop();
            if (this._unwindFramesTo(h.frame, { exVal, thrownTag, h })) {
              break;
            }
            if (this.handlerMatches(thrownTag, h.catchType)) {
              if (h.catchVar != null) h.frame.locals[h.catchVar] = exVal;
              this._pendingCaught = exVal;
              this.ip = h.catchAddr;
              break;
            }
          }
          break;
        }

        // --- control flow
        case "JUMP":
          this.ip = a;
          break;

        case "JUMP_IF_FALSE": {
          const cond = pop();
          if (!cond) this.ip = a;
          else this.ip++;
          break;
        }

        // --- print
        case "PRINT": {
          const v = pop();

          if (v === null) {
            console.log("null");
            this.ip++;
            break;
          }

          if (this.isPtr(v)) {
            console.log(`&${v.__ptr}`);
            this.ip++;
            break;
          }

          console.log(v);
          this.ip++;
          break;
        }

        case "PRINT_INLINE": {
          const v = pop();

          if (v === null) {
            process.stdout.write("null");
            this.ip++;
            break;
          }

          if (this.isPtr(v)) {
            process.stdout.write(`&${v.__ptr}`);
            this.ip++;
            break;
          }

          process.stdout.write(String(v));
          this.ip++;
          break;
        }

        // --- lists
        case "BUILD_LIST": {
          const n = a;
          const items = [];
          for (let i = 0; i < n; i++) items.unshift(pop());
          this.stack.push(items);
          this.ip++;
          break;
        }
        
        case "STR_LEN": {
          const s = pop();
          if (s === null) throw TypeErrorR("STR_LEN on null");
          if (typeof s !== "string") throw TypeErrorR("STR_LEN expects string");
          this.stack.push(s.length);
          this.ip++;
          break;
        }

        case "STR_APPEND_CHAR": {
          const ch = pop();
          const s = pop();
          if (s === null) throw TypeErrorR("STR_APPEND_CHAR on null");
          if (typeof s !== "string") throw TypeErrorR("STR_APPEND_CHAR expects string");
          // our 'char' is represented as int codepoint (0-255 typical)
          let c;
          if (typeof ch === "number") c = String.fromCharCode(ch);
          else if (typeof ch === "string" && ch.length > 0) c = ch[0];
          else throw TypeErrorR("STR_APPEND_CHAR expects char/int");
          this.stack.push(s + c);
          this.ip++;
          break;
        }


        case "LOAD_INDEX": {
          let idx = pop();
          let list = pop();
          // console.log("LOAD_INDEX entry", idx);
          
          // Debugging
          // console.log("LOAD_INDEX", list, idx);

          // Allow indexing through pointers/references (e.g., std::vector<T>& or T*)
          // Many stdlib operators lower to: load container -> compute index -> LOAD_INDEX.
          if (this.isPtrLike(list)) {
            const val = this.derefPtr(list, "indexing check");
            // If val is indexable (Array, string, or object with __fields), use it (it's a container ref).
            // Otherwise, treat 'list' as a pointer to an array of scalar values (pointer arithmetic).
            const isIndexable = 
               Array.isArray(val) || 
               typeof val === "string" || 
               (val && typeof val === "object" && val.__class);
            
            if (isIndexable) {
               list = val;
            } else {
               // Pointer arithmetic indexing: *(list + idx)
               let inner = (list && list.__ptr) ? list.__ptr : list;

               if (idx !== 0) {
                  if (inner && typeof inner === "object") {
                      if (inner.kind === "field") {
                          inner = { kind: "field", base: inner.base, offset: inner.offset + idx };
                      } else if (inner.kind === "stack") {
                          inner = { kind: "stack", frameIndex: inner.frameIndex, varIndex: inner.varIndex + idx };
                      }
                  }
               }
               const ptrToDeref = (inner === null) ? null : { __ptr: inner };
               const res = this.derefPtr(ptrToDeref, "pointer indexing");
               this.stack.push(res);
               this.ip++;
               break;
            }
          }
          
          // Handle vector objects - they have __class and __fields
          if (list && typeof list === "object" && list.__class && Array.isArray(list.__fields)) {
            const parts = list.__class.split("__");
            let baseName = parts[0];
            if (baseName === "std" && parts.length > 1) baseName = parts[1];

            // Vector
            if (baseName === "vector" || baseName.startsWith("vector")) {
              if (typeof idx !== "number") throw TypeErrorR("vector index must be number");
              // Vector data starts at index 2 (0 = size, 1 = capacity, 2+ = data)
              const dataStart = 2;
              const size = list.__fields[0] || 0;
              console.log(`[LOAD_INDEX] vector[${idx}] size=${size}`);
              if (idx < 0 || idx >= size) throw IndexErrorR("vector index out of range");
              this.stack.push(list.__fields[dataStart + idx]);
              this.ip++;
              break;
            }
            // Map
            if (baseName === "map" || baseName.startsWith("map")) {
               const key = idx;
               let foundIdx = -1;
               for (let i = 0; i < list.__fields.length; i += 2) {
                 if (list.__fields[i] === key) {
                    foundIdx = i + 1;
                    break;
                 }
               }
               if (foundIdx >= 0) {
                 this.stack.push(list.__fields[foundIdx]);
               } else {
                 // Create new entry with default value 0
                 list.__fields.push(key);
                 list.__fields.push(0);
                 this.stack.push(0);
               }
               this.ip++;
               break;
            }
          }
          

	          // String indexing (std::string / basic_string operator[])
	          if (typeof list === "string") {
	            if (typeof idx !== "number") throw TypeErrorR("string index must be number");
	            const len = list.length;
	            if (idx < 0) idx = len + idx;
	            if (idx < 0 || idx >= len) throw IndexErrorR("string index out of range");
	            // Return a 1-character JS string as the VM "char" value.
	            this.stack.push(list[idx]);
	            this.ip++;
	            break;
	          }

	          if (!Array.isArray(list)) throw TypeErrorR("indexing non-list");

          if (typeof idx !== "number") throw TypeErrorR("list index must be number");
          if (idx < 0) idx = list.length + idx;
          if (idx < 0 || idx >= list.length) throw IndexErrorR("list index out of range");

          this.stack.push(list[idx]);
          this.ip++;
          break;
        }

        case "STORE_INDEX": {
          const value = pop();
          let idx = pop();
	          let list = pop();

	          // Allow store through references/pointers.
          if (this.isPtrLike(list)) {
             const val = this.derefPtr(list, "store check");
             const isIndexable = 
                Array.isArray(val) || 
                typeof val === "string" || 
                (val && typeof val === "object" && val.__class);

             if (isIndexable) {
                // It's a container reference
                list = val;
             } else {
                // Pointer arithmetic store: *(list + idx) = value
               let inner = (list && list.__ptr) ? list.__ptr : list;

               if (idx !== 0) {
                  if (inner && typeof inner === "object") {
                      if (inner.kind === "field") {
                          inner = { kind: "field", base: inner.base, offset: inner.offset + idx };
                      } else if (inner.kind === "stack") {
                          inner = { kind: "stack", frameIndex: inner.frameIndex, varIndex: inner.varIndex + idx };
                      }
                  }
               }
               const ptrToStore = (inner === null) ? null : { __ptr: inner };
               this.storeThroughPtr(ptrToStore, value, "pointer index assignment");
                this.ip++;
                break;
             }
          }

	          // Vector object store (matches LOAD_INDEX behavior)
          if (list && typeof list === "object" && list.__class && Array.isArray(list.__fields)) {
            const parts = list.__class.split("__");
            let baseName = parts[0];
            if (baseName === "std" && parts.length > 1) baseName = parts[1];

            // Vector
            if (baseName === "vector" || baseName.startsWith("vector")) {
              if (typeof idx !== "number") throw TypeErrorR("vector index must be number");
              const dataStart = 2;
              const size = list.__fields[0] || 0;
              if (idx < 0 || idx >= size) throw IndexErrorR("vector index out of range");
              list.__fields[dataStart + idx] = value;
              this.ip++;
              break;
            }
            // Map
            if (baseName === "map" || baseName.startsWith("map")) {
               const key = idx;
               let foundIdx = -1;
               for (let i = 0; i < list.__fields.length; i += 2) {
                 if (list.__fields[i] === key) {
                    foundIdx = i + 1;
                    break;
                 }
               }
               if (foundIdx >= 0) {
                 list.__fields[foundIdx] = value;
               } else {
                 // Create new entry
                 list.__fields.push(key);
                 list.__fields.push(value);
               }
               this.ip++;
               break;
            }
          }

	          if (!Array.isArray(list)) throw TypeErrorR("indexing non-list");

          if (typeof idx !== "number") throw TypeErrorR("list index must be number");
          if (idx < 0) idx = list.length + idx;
          if (idx < 0 || idx >= list.length) throw IndexErrorR("list assignment index out of range");

          list[idx] = value;
          this.ip++;
          break;
        }

        // stack: obj, start, end (start/end can be null)
        case "SLICE": {
          let end = pop();
          let start = pop();
          const obj = pop();

          const isList = Array.isArray(obj);
          const isString = typeof obj === "string";
          if (!isList && !isString) throw TypeErrorR("slicing unsupported type");

          const len = obj.length;
          if (start === null) start = 0;
          if (end === null) end = len;

          if (typeof start !== "number" || typeof end !== "number")
            throw TypeErrorR("slice indices must be numbers or null");

          if (start < 0) start = len + start;
          if (end < 0) end = len + end;

          start = Math.max(0, Math.min(len, start));
          end = Math.max(0, Math.min(len, end));

          this.stack.push(obj.slice(start, end));
          this.ip++;
          break;
        }

        // --- structs (stack-only value semantics)
        case "ALLOC_STRUCT": {
          const structName = a;
          const n = b;
          this.stack.push({ __struct: structName, __fields: Array(n).fill(0) });
          this.ip++;
          break;
        }

        case "CLONE_STRUCT": {
          const obj = pop();
          if (!obj || typeof obj !== "object" || !Array.isArray(obj.__fields))
            throw TypeErrorR("clone on non-struct");
          this.stack.push({
            __struct: obj.__struct,
            __class: obj.__class,
            __vtableClass: obj.__vtableClass,
            __fields: obj.__fields.slice(),
          });
          this.ip++;
          break;
        }

        case "LOAD_FIELD": {
          let off = a;
          if (off && typeof off === "object" && typeof off.offset === "number") off = off.offset; // extra defense
          const obj = pop();
          if (!obj || typeof obj !== "object" || !Array.isArray(obj.__fields))
            throw TypeErrorR("field access on non-struct");
          if (off < 0 || off >= obj.__fields.length)
            throw new RuntimeError("RuntimeError", "invalid field offset");
          this.stack.push(obj.__fields[off]);
          this.ip++;
          break;
        }

        case "STORE_FIELD": {
          let off = a;
          if (off && typeof off === "object" && typeof off.offset === "number") off = off.offset; // extra defense
          const value = pop();
          const obj = pop();
          if (!obj || typeof obj !== "object" || !Array.isArray(obj.__fields))
            throw TypeErrorR("field store on non-struct");
          if (off < 0 || off >= obj.__fields.length)
            throw new RuntimeError("RuntimeError", "invalid field offset");
          obj.__fields[off] = value;
          this.ip++;
          break;
        }

        // --- Option 2 classes: allocation (stack object, not heap pointer)
        case "ALLOC_OBJ": {
          // ins: ["ALLOC_OBJ", {className, n}]
          const info = a || {};
          const className = info.className ?? info.name ?? null;
          const n = info.n ?? 0;
          const obj = { __class: className, __vtableClass: className, __fields: Array(n).fill(0) };
          this.stack.push(obj);
          this.ip++;
          break;
        }

        // -------------------------
        // v0.8: VTABLE + INDIRECT CALL
        // -------------------------

        // stack: [obj] -> [vtableObj]
        case "LOAD_VTABLE": {
          const obj = pop();
          if (!obj || typeof obj !== "object") throw TypeErrorR("LOAD_VTABLE on non-object");
          const vt = this.resolveVTableForObject(obj);
          this.stack.push(vt);
          this.ip++;
          break;
        }

        // stack: [vtableObj] -> [funcAddr]
        case "LOAD_VFUNC": {
          const slot = a;
          const vt = pop();
          if (!vt || typeof vt !== "object") throw TypeErrorR("LOAD_VFUNC on non-vtable");
          if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 0)
            throw new RuntimeError("RuntimeError", "LOAD_VFUNC invalid slot");
          const addrs = vt.slotAddrs || [];
          if (slot >= addrs.length) throw new RuntimeError("RuntimeError", "LOAD_VFUNC slot out of range");
          const addr = addrs[slot];
          if (typeof addr !== "number" || !Number.isInteger(addr) || addr < 0)
            throw new RuntimeError("RuntimeError", "LOAD_VFUNC invalid function pointer");
          this.stack.push(addr);
          this.ip++;
          break;
        }

        // stack: [... args..., funcAddr] and argc tells number of args (including receiver at arg0)
        case "CALL_INDIRECT": {
          const argc = a;
          if (typeof argc !== "number" || !Number.isInteger(argc) || argc < 0)
            throw new RuntimeError("RuntimeError", "CALL_INDIRECT invalid argc");

          const addr = pop();
          if (typeof addr !== "number" || !Number.isInteger(addr) || addr < 0 || addr >= this.bytecode.length) {
            throw new RuntimeError("RuntimeError", "CALL_INDIRECT invalid function address");
          }

          const args = [];
          for (let i = 0; i < argc; i++) args.unshift(pop());

          this.frames.push({ returnIp: this.ip + 1, locals: {}, __alive: true, __fid: this.nextFrameId++ });
          const nf = this.currentFrame();
          for (let i = 0; i < args.length; i++) nf.locals[`$arg${i}`] = args[i];

          this.ip = addr;
          break;
        }

        // -------------------------
        // v0.7: Heap + pointers
        // -------------------------

        // ["ALLOC_OBJECT", { kind:"struct"|"class", name, n }]
        // pushes pointer (tagged pointer object)
        case "ALLOC_OBJECT": {
          const info = a || {};
          const kind = info.kind ?? null;
          const name = info.name ?? info.className ?? info.structName ?? null;
          const n = info.n ?? 0;

          if (kind !== "struct" && kind !== "class") {
            throw new RuntimeError("RuntimeError", "ALLOC_OBJECT missing kind");
          }
          if (typeof name !== "string" || name.length === 0) {
            throw new RuntimeError("RuntimeError", "ALLOC_OBJECT missing name");
          }
          if (typeof n !== "number" || !Number.isInteger(n) || n < 0) {
            throw new RuntimeError("RuntimeError", "ALLOC_OBJECT invalid field count");
          }

          const obj =
            kind === "struct"
              ? { __struct: name, __fields: Array(n).fill(0) }
              : { __class: name, __vtableClass: name, __fields: Array(n).fill(0) };

          const ptr = this.allocHeapObject(obj);
          this.stack.push(this.mkPtr(ptr));
          this.ip++;
          break;
        }

        // pops pointer; in v0.8.1, delete calls destructors for class objects before freeing
        case "FREE_OBJECT": {
          const ptr = pop();
          // NOTE: delete null is a no-op (handled inside startDelete)
          this._beginDelete(ptr, this.ip + 1);
          // startDelete either:
          //  - continues execution at originIp (no destructor / null), or
          //  - jumps to a destructor function (and will resume deletion on RETURN)
          break;
        }

        // pops pointer; pushes underlying object (error on null/invalid)
        case "LOAD_PTR": {
          const ptr = pop();
          const obj = this.derefPtr(ptr, "dereference");
          this.stack.push(obj);
          this.ip++;
          break;
        }

        // pushes a pointer to a local slot (used for references)
        case "ADDR_VAR": {
          const name = a;
          this.stack.push(this.mkSlotPtr(frame, name));
          this.ip++;
          break;
        }

        // pops base pointer; pushes a pointer to a field (used for references)
        case "ADDR_PTR_FIELD": {
          let off = a;
          if (off && typeof off === "object" && typeof off.offset === "number") off = off.offset;
          const basePtr = pop();
          this.stack.push(this.mkFieldPtr(basePtr, off));
          this.ip++;
          break;
        }

        // pops value then pointer; stores through a reference pointer
        case "STORE_PTR": {
          const value = pop();
          const ptr = pop();
          this.storeThroughPtr(ptr, value, "store");
          this.ip++;
          break;
        }

        // pops pointer; pushes field value
        case "LOAD_PTR_FIELD": {
          let off = a;
          if (off && typeof off === "object" && typeof off.offset === "number") off = off.offset;

          const ptr = pop();
          const obj = this.derefPtr(ptr, "field load");
          if (!obj || typeof obj !== "object" || !Array.isArray(obj.__fields)) {
            throw TypeErrorR("ptr field access on non-object");
          }
          if (typeof off !== "number" || !Number.isInteger(off)) {
            throw new RuntimeError("RuntimeError", "invalid field offset");
          }
          if (off < 0 || off >= obj.__fields.length)
            throw new RuntimeError("RuntimeError", "invalid field offset");

          this.stack.push(obj.__fields[off]);
          this.ip++;
          break;
        }

        // pops value then pointer; stores field
        case "STORE_PTR_FIELD": {
          let off = a;
          if (off && typeof off === "object" && typeof off.offset === "number") off = off.offset;

          const value = pop();
          const ptr = pop();
          const obj = this.derefPtr(ptr, "field store");
          if (!obj || typeof obj !== "object" || !Array.isArray(obj.__fields)) {
            throw TypeErrorR("ptr field store on non-object");
          }
          if (typeof off !== "number" || !Number.isInteger(off)) {
            throw new RuntimeError("RuntimeError", "invalid field offset");
          }
          if (off < 0 || off >= obj.__fields.length)
            throw new RuntimeError("RuntimeError", "invalid field offset");

          obj.__fields[off] = value;
          this.ip++;
          break;
        }

        // --- calls
        case "CALL": {
          const addr = a; // may be undefined for builtins
          const argc = b;
          const fname = c;

          // builtins support
          if (addr === undefined) {
            if (fname === "len") {
              if (argc !== 1) throw TypeErrorR("len() takes exactly one argument");
              const v = pop();
              if (typeof v === "string" || Array.isArray(v)) this.stack.push(v.length);
              else throw TypeErrorR("len() unsupported type");
              this.ip++;
              break;
            }
            if (fname === "input") {
              if (argc === 1) process.stdout.write(String(pop()));
              else if (argc !== 0) throw TypeErrorR("input() takes 0 or 1 argument");
              this.stack.push(readline.question(""));
              this.ip++;
              break;
            }
            
            // Memory management builtins
            if (fname === "malloc") {
              if (argc !== 1) throw TypeErrorR("malloc() takes exactly one argument");
              const size = pop();
              if (typeof size !== "number" || !Number.isInteger(size) || size < 0) {
                throw TypeErrorR("malloc() size must be a non-negative integer");
              }
              // Allocate a heap object representing the allocated memory.
              // For the C compiler, struct-pointer field accesses (p->f) are lowered to LOAD_PTR_FIELD /
              // STORE_PTR_FIELD and expect a __fields array. We alias __data to __fields so malloc'd memory
              // can be used as a simple "word array" backing structs (CP-grade subset).
              const data = new Array(size).fill(0);
              const obj = { __class: "malloc_block", __size: size, __data: data, __fields: data };
              const ptr = this.allocHeapObject(obj);
              // Return a tagged pointer so pointer ops don't collide with plain integers.
              this.stack.push(this.mkPtr(ptr));
              this.ip++;
              break;
            }
            if (fname === "free") {
              if (argc !== 1) throw TypeErrorR("free() takes exactly one argument");
              const ptr = pop();
              if (!this.isPtr(ptr)) throw TypeErrorR("free() requires a pointer");
              const id = this.ptrId(ptr, "free");
              if (id === null) {
                // free(NULL) is a no-op
                this.ip++;
                break;
              }
              const obj = this.heap.get(id);
              if (!obj || obj.__class !== "malloc_block") {
                throw new RuntimeError("RuntimeError", "free() on invalid pointer");
              }
              this.heap.delete(id);
              this.freeList.push(id);
              this.heapFrees++;
              this.ip++;
              break;
            }
            if (fname === "memset") {
              if (argc !== 3) throw TypeErrorR("memset() takes exactly 3 arguments");
              const value = pop();
              const count = pop();
              const ptr = pop();
              if (!this.isPtr(ptr)) throw TypeErrorR("memset() requires a pointer");
              if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
                throw TypeErrorR("memset() count must be a non-negative integer");
              }
              const id = this.ptrId(ptr, "memset");
              if (id === null) throw new RuntimeError("RuntimeError", "memset() on null pointer");
              const obj = this.heap.get(id);
              if (!obj || obj.__class !== "malloc_block") {
                throw new RuntimeError("RuntimeError", "memset() on invalid pointer");
              }
              for (let i = 0; i < count && i < obj.__data.length; i++) {
                obj.__data[i] = value;
              }
              this.stack.push(ptr);
              this.ip++;
              break;
            }
            if (fname === "memcpy") {
              if (argc !== 3) throw TypeErrorR("memcpy() takes exactly 3 arguments");
              const count = pop();
              const src = pop();
              const dest = pop();
              if (!this.isPtr(dest) || !this.isPtr(src)) throw TypeErrorR("memcpy() requires pointers");
              if (typeof count !== "number" || !Number.isInteger(count) || count < 0) {
                throw TypeErrorR("memcpy() count must be a non-negative integer");
              }
              const destId = this.ptrId(dest, "memcpy dest");
              const srcId = this.ptrId(src, "memcpy src");
              if (destId === null || srcId === null) {
                throw new RuntimeError("RuntimeError", "memcpy() on null pointer");
              }
              const destObj = this.heap.get(destId);
              const srcObj = this.heap.get(srcId);
              if (!destObj || destObj.__class !== "malloc_block" || !srcObj || srcObj.__class !== "malloc_block") {
                throw new RuntimeError("RuntimeError", "memcpy() on invalid pointer");
              }
              for (let i = 0; i < count && i < destObj.__data.length && i < srcObj.__data.length; i++) {
                destObj.__data[i] = srcObj.__data[i];
              }
              this.stack.push(dest);
              this.ip++;
              break;
            }
            
            // Fast IO builtins
            if (fname === "readInt" || fname === "readLong") {
              if (argc !== 0) throw TypeErrorR(`${fname}() takes no arguments`);
              const input = readline.question("");
              const value = parseInt(input.trim(), 10);
              if (isNaN(value)) throw new RuntimeError("RuntimeError", `Invalid integer input: ${input}`);
              this.stack.push(value);
              this.ip++;
              break;
            }
            if (fname === "readDouble") {
              if (argc !== 0) throw TypeErrorR("readDouble() takes no arguments");
              const input = readline.question("");
              const value = parseFloat(input.trim());
              if (isNaN(value)) throw new RuntimeError("RuntimeError", `Invalid float input: ${input}`);
              this.stack.push(value);
              this.ip++;
              break;
            }
            if (fname === "writeInt" || fname === "writeLong") {
              if (argc !== 1) throw TypeErrorR(`${fname}() takes exactly one argument`);
              const value = pop();
              if (typeof value !== "number" || !Number.isInteger(value)) {
                throw TypeErrorR(`${fname}() requires an integer`);
              }
              process.stdout.write(String(value));
              this.ip++;
              break;
            }
            if (fname === "writeDouble") {
              if (argc !== 1) throw TypeErrorR("writeDouble() takes exactly one argument");
              const value = pop();
              if (typeof value !== "number") throw TypeErrorR("writeDouble() requires a number");
              process.stdout.write(String(value));
              this.ip++;
              break;
            }
            if (fname === "writeChar") {
              if (argc !== 1) throw TypeErrorR("writeChar() takes exactly one argument");
              const value = pop();
              if (typeof value !== "number" && typeof value !== "string") {
                throw TypeErrorR("writeChar() requires a char or int");
              }
              const ch = typeof value === "number" ? String.fromCharCode(value) : value[0] || "";
              process.stdout.write(ch);
              this.ip++;
              break;
            }
            if (fname === "writeString") {
              if (argc !== 1) throw TypeErrorR("writeString() takes exactly one argument");
              const ptr = pop();
              // For now, treat string pointer as a string value (simplified)
              if (typeof ptr === "string") {
                process.stdout.write(ptr);
              } else if (this.isPtr(ptr)) {
                const id = this.ptrId(ptr, "writeString");
                if (id !== null) {
                  const obj = this.heap.get(id);
                  if (obj && typeof obj === "string") {
                    process.stdout.write(obj);
                  } else {
                    process.stdout.write("(string)");
                  }
                }
              }
              this.ip++;
              break;
            }
            if (fname === "newline") {
              if (argc !== 0) throw TypeErrorR("newline() takes no arguments");
              process.stdout.write("\n");
              this.ip++;
              break;
            }

            // ════════════════════════════════════════════════════════════════
            // C STANDARD LIBRARY RUNTIME BUILTINS
            // ════════════════════════════════════════════════════════════════

            // ── stdio ─────────────────────────────────────────────────────
            if (fname === "putchar") {
              const v = pop();
              const ch = typeof v === "number" ? String.fromCharCode(v) : String(v)[0] || "";
              process.stdout.write(ch);
              this.stack.push(typeof v === "number" ? v : v.charCodeAt(0));
              this.ip++; break;
            }
            if (fname === "getchar") {
              // In non-interactive mode, read one char from readline
              const line = readline.question("");
              this.stack.push(line.length > 0 ? line.charCodeAt(0) : -1);
              this.ip++; break;
            }
            if (fname === "fflush") {
              pop(); // stream arg
              this.stack.push(0);
              this.ip++; break;
            }
            if (fname === "printf" || fname === "fprintf") {
              // Fallback dynamic printf — format string already on stack as args
              // args are in order: [stream?], fmt, arg1, arg2, ...
              const args = [];
              for (let k = 0; k < argc; k++) args.unshift(pop());
              const fmtIdx = fname === "fprintf" ? 1 : 0;
              const fmtRaw = typeof args[fmtIdx] === "string" ? args[fmtIdx] : "";
              let out = _vmFormatString(fmtRaw, args.slice(fmtIdx + 1));
              process.stdout.write(out);
              this.stack.push(out.length);
              this.ip++; break;
            }
            if (fname === "sprintf" || fname === "snprintf") {
              const args = [];
              for (let k = 0; k < argc; k++) args.unshift(pop());
              // args[0] = buf (ignore for now), args[1 or 2] = fmt
              const fmtIdx = fname === "snprintf" ? 2 : 1;
              const fmtRaw = typeof args[fmtIdx] === "string" ? args[fmtIdx] : "";
              const out = _vmFormatString(fmtRaw, args.slice(fmtIdx + 1));
              // Store into buf pointer if it's a heap pointer (simplified: we skip actual buf write)
              this.stack.push(out.length);
              this.ip++; break;
            }
            if (fname === "sscanf") {
              const args = [];
              for (let k = 0; k < argc; k++) args.unshift(pop());
              // sscanf(str, fmt, &a, &b, ...) — simplified
              this.stack.push(0);
              this.ip++; break;
            }

            // ── printf format helper ─────────────────────────────────────
            if (fname === "__printf_fmt") {
              // Stack: [..., spec, value] — value was pushed LAST
              const val = pop();   // value pushed second → popped first
              const spec = pop();  // spec pushed first → popped second
              const formatted = _vmFormatString(typeof spec === "string" ? spec : "%s", [val]);
              this.stack.push(formatted);
              this.ip++; break;
            }
            if (fname === "readStringC") {
              const line = readline.question("");
              this.stack.push(line.trim());
              this.ip++; break;
            }
            if (fname === "readCharC") {
              const line = readline.question("");
              this.stack.push(line.length > 0 ? line.charCodeAt(0) : -1);
              this.ip++; break;
            }

            // ── string.h ────────────────────────────────────────────────
            if (fname === "strlen") {
              const s = pop();
              if (typeof s === "string") { this.stack.push(s.length); }
              else if (Array.isArray(s)) {
                // char array: count until 0
                let len = 0;
                while (len < s.length && s[len] !== 0 && s[len] !== "\0") len++;
                this.stack.push(len);
              } else { this.stack.push(0); }
              this.ip++; break;
            }
            if (fname === "strcmp" || fname === "strncmp") {
              if (fname === "strncmp") { const n = pop(); } // eslint-disable-line no-unused-vars
              const b = pop(), a = pop();
              const sa = typeof a === "string" ? a : String(a);
              const sb = typeof b === "string" ? b : String(b);
              this.stack.push(sa < sb ? -1 : sa > sb ? 1 : 0);
              this.ip++; break;
            }
            if (fname === "strcpy" || fname === "strncpy") {
              if (fname === "strncpy") pop(); // n
              const src = pop(), dst = pop();
              this.stack.push(typeof src === "string" ? src : String(src));
              this.ip++; break;
            }
            if (fname === "strcat" || fname === "strncat") {
              if (fname === "strncat") pop(); // n
              const src = pop(), dst = pop();
              const result = (typeof dst === "string" ? dst : "") + (typeof src === "string" ? src : "");
              this.stack.push(result);
              this.ip++; break;
            }
            if (fname === "strchr") {
              const c = pop(), s = pop();
              const str = typeof s === "string" ? s : String(s);
              const ch = typeof c === "number" ? String.fromCharCode(c) : String(c)[0];
              const idx = str.indexOf(ch);
              this.stack.push(idx >= 0 ? str.slice(idx) : null);
              this.ip++; break;
            }
            if (fname === "strstr") {
              const needle = pop(), haystack = pop();
              const hs = typeof haystack === "string" ? haystack : String(haystack);
              const nd = typeof needle === "string" ? needle : String(needle);
              const idx = hs.indexOf(nd);
              this.stack.push(idx >= 0 ? hs.slice(idx) : null);
              this.ip++; break;
            }
            if (fname === "strtok") {
              // Very simplified: split on delimiter and return tokens
              const delim = pop(), str = pop();
              if (str === null) { this.stack.push(null); }
              else {
                const s = typeof str === "string" ? str : String(str);
                this.stack.push(s.split("")[0] || null); // simplified
              }
              this.ip++; break;
            }
            if (fname === "strrev") {
              const s = pop();
              const str = typeof s === "string" ? s : String(s);
              this.stack.push(str.split("").reverse().join(""));
              this.ip++; break;
            }
            if (fname === "strtol") {
              const base = pop(), _end = pop(), s = pop();
              const str = typeof s === "string" ? s : String(s);
              this.stack.push(parseInt(str.trim(), base || 10) || 0);
              this.ip++; break;
            }
            if (fname === "strtod") {
              const _end = pop(), s = pop();
              const str = typeof s === "string" ? s : String(s);
              this.stack.push(parseFloat(str.trim()) || 0);
              this.ip++; break;
            }

            // ── stdlib.h ─────────────────────────────────────────────────
            if (fname === "atoi" || fname === "atol") {
              const s = pop();
              this.stack.push(parseInt(typeof s === "string" ? s.trim() : String(s), 10) || 0);
              this.ip++; break;
            }
            if (fname === "atof") {
              const s = pop();
              this.stack.push(parseFloat(typeof s === "string" ? s.trim() : String(s)) || 0);
              this.ip++; break;
            }
            if (fname === "c_abs") {
              const v = pop();
              this.stack.push(Math.abs(typeof v === "number" ? v : Number(v)));
              this.ip++; break;
            }
            if (fname === "c_rand") {
              this.stack.push(Math.floor(Math.random() * 32768));
              this.ip++; break;
            }
            if (fname === "c_srand") { pop(); this.stack.push(0); this.ip++; break; }
            if (fname === "c_qsort") {
              // c_qsort(base, n, size, cmp) — simplified for int arrays
              const _cmpFn = pop(), _size = pop(), n = pop(), base = pop();
              if (Array.isArray(base)) base.sort((a, b) => a - b);
              this.stack.push(0);
              this.ip++; break;
            }
            if (fname === "calloc") {
              const size = pop(), count = pop();
              const arr = new Array(count * size).fill(0);
              this.stack.push(arr);
              this.ip++; break;
            }
            if (fname === "realloc") {
              const newSize = pop(), ptr = pop();
              if (Array.isArray(ptr)) {
                ptr.length = newSize;
                this.stack.push(ptr);
              } else {
                this.stack.push(new Array(newSize).fill(0));
              }
              this.ip++; break;
            }
            if (fname === "memmove") {
              const count = pop(), src = pop(), dest = pop();
              if (this.isPtr(dest) && this.isPtr(src)) {
                const destId = this.ptrId(dest, "memmove");
                const srcId = this.ptrId(src, "memmove");
                if (destId !== null && srcId !== null) {
                  const destObj = this.heap.get(destId);
                  const srcObj = this.heap.get(srcId);
                  if (destObj && srcObj && destObj.__data && srcObj.__data) {
                    for (let k = 0; k < count && k < srcObj.__data.length; k++) {
                      if (k < destObj.__data.length) destObj.__data[k] = srcObj.__data[k];
                    }
                  }
                }
              }
              this.stack.push(dest);
              this.ip++; break;
            }
            if (fname === "abort") {
              throw new Error("abort() called");
            }

            // ── math.h ──────────────────────────────────────────────────
            if (fname === "c_sqrt")  { const v = pop(); this.stack.push(Math.sqrt(v)); this.ip++; break; }
            if (fname === "c_fabs")  { const v = pop(); this.stack.push(Math.abs(v));  this.ip++; break; }
            if (fname === "c_ceil")  { const v = pop(); this.stack.push(Math.ceil(v)); this.ip++; break; }
            if (fname === "c_floor") { const v = pop(); this.stack.push(Math.floor(v));this.ip++; break; }
            if (fname === "c_round") { const v = pop(); this.stack.push(Math.round(v));this.ip++; break; }
            if (fname === "c_exp")   { const v = pop(); this.stack.push(Math.exp(v));  this.ip++; break; }
            if (fname === "c_log")   { const v = pop(); this.stack.push(Math.log(v));  this.ip++; break; }
            if (fname === "c_log2")  { const v = pop(); this.stack.push(Math.log2(v)); this.ip++; break; }
            if (fname === "c_log10") { const v = pop(); this.stack.push(Math.log10(v));this.ip++; break; }
            if (fname === "c_sin")   { const v = pop(); this.stack.push(Math.sin(v));  this.ip++; break; }
            if (fname === "c_cos")   { const v = pop(); this.stack.push(Math.cos(v));  this.ip++; break; }
            if (fname === "c_tan")   { const v = pop(); this.stack.push(Math.tan(v));  this.ip++; break; }
            if (fname === "c_pow")   { const b = pop(); const a = pop(); this.stack.push(Math.pow(a,b)); this.ip++; break; }
            if (fname === "c_fmin")  { const b = pop(); const a = pop(); this.stack.push(Math.min(a,b)); this.ip++; break; }
            if (fname === "c_fmax")  { const b = pop(); const a = pop(); this.stack.push(Math.max(a,b)); this.ip++; break; }
            if (fname === "c_fmod")  { const b = pop(); const a = pop(); this.stack.push(a % b); this.ip++; break; }
            if (fname === "c_hypot") { const b = pop(); const a = pop(); this.stack.push(Math.hypot(a,b)); this.ip++; break; }
            if (fname === "c_atan2") { const b = pop(); const a = pop(); this.stack.push(Math.atan2(a,b)); this.ip++; break; }

            // ════════════════════════════════════════════════════════════════
            // END C STANDARD LIBRARY RUNTIME BUILTINS
            // ════════════════════════════════════════════════════════════════

            throw new RuntimeError("RuntimeError", `unknown function '${fname}'`);
          }

          const args = [];
          for (let i = 0; i < argc; i++) args.unshift(pop());

          this.frames.push({ returnIp: this.ip + 1, locals: {}, __alive: true, __fid: this.nextFrameId++ });
          const nf = this.currentFrame();
          for (let i = 0; i < args.length; i++) nf.locals[`$arg${i}`] = args[i];

          this.ip = addr;
          break;
        }

        // Option 2 dispatch:
        // bytecode: ["CALL_METHOD", explicitClassName|null, methodName, argc]
        // stack before: receiver, arg1..argN
        case "CALL_METHOD": {
          const explicitClass = a;
          const methodName = b;
          const argc = c;

          const args = [];
          for (let i = 0; i < argc; i++) args.unshift(pop());
          const receiver = pop();

          if (!receiver || typeof receiver !== "object") throw TypeErrorR("method call on non-object");

          const className = explicitClass ?? receiver.__class ?? receiver.__struct ?? null;

          if (!className) throw new RuntimeError("RuntimeError", "object has no class for method dispatch");

          const cmap = this.classMethods.get(className);
          if (!cmap) throw new RuntimeError("RuntimeError", `unknown class '${className}'`);

          const addr = cmap.get(methodName);
          if (addr == null)
            throw new RuntimeError("RuntimeError", `method '${className}.${methodName}' not found`);

          // Runtime-provided methods (marked with __RUNTIME__) are handled by VM builtins
          if (addr === "__RUNTIME__") {
            // Handle runtime methods for template classes
            this.handleRuntimeMethod(className, methodName, receiver, args);
            this.ip++;
            break;
          }

          this.frames.push({ returnIp: this.ip + 1, locals: {}, __alive: true, __fid: this.nextFrameId++ });
          const nf = this.currentFrame();
          nf.locals[`$arg0`] = receiver; // this
          for (let i = 0; i < args.length; i++) nf.locals[`$arg${i + 1}`] = args[i];

          this.ip = addr;
          break;
        }

        case "RETURN": {
          // v0.8.1: if we are returning from a destructor called by delete, continue...
          if (frame && frame.__deleteState) {
            const state = frame.__deleteState;
            frame.__alive = false;
            this.frames.pop();
            // Continue delete chain (may call next destructor or free and resume)
            this._continueDelete(state);
            break;
          }

          // v0.9 continuation: if we are returning from a destructor invoked by frame-dtor
          if (frame && frame.__frameDtorState) {
            const state = frame.__frameDtorState;
            frame.__alive = false;
            this.frames.pop();
            this._continueFrameDtors(state);
            break;
          }

          // If this frame registered stack destructors, run them before returning.
          if (frame && frame.__dtors && frame.__dtors.length > 0) {
            const dt = frame.__dtors;
            const retIp = frame.returnIp;
            frame.__alive = false;
            this.frames.pop();
            this._beginFrameDtors(dt, { kind: 'return', retIp, hasRetVal: false });
            break;
          }

          const retIp = frame.returnIp;
          frame.__alive = false;
          this.frames.pop();
          if (retIp === -1) return;
          this.ip = retIp;
          break;
        }

        case "RETURN_VAL": {
          // v0.8.1: allow destructors (should return void) to use RETURN_VAL defensively
          if (frame && frame.__deleteState) {
            const _value = pop();
            const state = frame.__deleteState;
            frame.__alive = false;
            this.frames.pop();
            // Ignore returned value for destructor, but keep stack consistent
            this._continueDelete(state);
            break;
          }

          if (frame && frame.__frameDtorState) {
            const _value = pop();
            const state = frame.__frameDtorState;
            frame.__alive = false;
            this.frames.pop();
            // ignore returned value
            this._continueFrameDtors(state);
            break;
          }

          // If this frame registered stack destructors, run them before returning a value.
          if (frame && frame.__dtors && frame.__dtors.length > 0) {
            const value = pop();
            const dt = frame.__dtors;
            const retIp = frame.returnIp;
            frame.__alive = false;
            this.frames.pop();
            this._beginFrameDtors(dt, { kind: 'return', retIp, hasRetVal: true, retVal: value });
            break;
          }

          const value = pop();
          const retIp = frame.returnIp;
          frame.__alive = false;
          this.frames.pop();
          this.stack.push(value);
          if (retIp === -1) return;
          this.ip = retIp;
          break;
        }

        case "HALT": {
          if (this.warnLeaks && this.heap.size > 0) {
            console.warn(
              `[heap] WARNING: ${this.heap.size} heap object(s) still allocated at program end (allocs=${this.heapAllocs}, frees=${this.heapFrees}).`
            );
          }
          return;
        }

        default:
          throw new RuntimeError("RuntimeError", `Unknown opcode ${op}`);
      }
    }
  }

  // Handle runtime-provided methods for template classes
  handleRuntimeMethod(className, methodName, receiver, args) {
    // console.log(`[RuntimeMethod] ${className}::${methodName}`);
    // Extract base class name from template instantiation (e.g., "vector__int" -> "vector")
    // Also handle "std__vector__int" -> "vector"
    const parts = className.split("__");
    let baseName = parts[0];
    if (baseName === "std" && parts.length > 1) {
      baseName = parts[1];
    }
    
    // Vector methods
    if (baseName === "vector" || baseName.startsWith("vector")) {
      if (methodName === "push_back") {
        if (args.length !== 1) throw new RuntimeError("RuntimeError", "push_back expects 1 argument");
        if (!receiver.__fields) receiver.__fields = [];
        
        // Ensure size and capacity slots exist
        if (receiver.__fields.length < 2) {
          receiver.__fields[0] = 0; // size
          receiver.__fields[1] = 0; // capacity
        }
        
        // push_back(const T& value) receives a pointer/reference to the value.
        // We must dereference it to store the actual value in the vector.
        let val = args[0];
        if (this.isPtrLike(val)) {
           val = this.derefPtr(val, "push_back value");
        }
        
        // Store at correct index (2 + size), overwriting any existing dummy fields
         const size = receiver.__fields[0];
         const dataStart = 2;
         receiver.__fields[dataStart + size] = val;
        
        receiver.__fields[0] = size + 1; // increment size
        this.stack.push(null); // void return
        return;
      }
      if (methodName === "size") {
        if (!receiver.__fields) receiver.__fields = [0, 0];
        // For vector, size is stored at index 0
        const size = receiver.__fields[0] || 0;
        this.stack.push(size);
        return;
      }
      if (methodName === "data") {
        // Return pointer to data array
        // For vector, data() returns a pointer to the first element
        // We need to create a pointer that points to the vector's data
        if (!receiver.__fields) receiver.__fields = [0, 0];
        // Store the vector object in heap and return a pointer to it
        // For simplicity, we'll use the receiver's heap address if it exists, or allocate one
        let baseAddr;
        if (receiver.__heapAddr) {
          baseAddr = receiver.__heapAddr;
        } else {
          // Allocate on heap and store pointer
          // Store the actual vector object
          baseAddr = this.allocHeapObject(receiver);
          receiver.__heapAddr = baseAddr;
        }
        // Return a field pointer to the start of data (offset 2)
        const basePtr = this.mkPtr(baseAddr);
        this.stack.push(this.mkFieldPtr(basePtr, 2));
        return;
      }
    }
    
    // Map methods
    if (baseName === "map" || baseName.startsWith("map")) {
      if (methodName.startsWith("operator") && methodName.includes("[")) {
        // operator[] - simplified implementation
        if (args.length !== 1) throw new RuntimeError("RuntimeError", "operator[] expects 1 argument");
        if (!receiver.__fields) receiver.__fields = [];
        // Simple key-value storage: [key1, val1, key2, val2, ...]
        let key = args[0];
        if (this.isPtrLike(key)) key = this.derefPtr(key, "map key");

        let idx = -1;
        for (let i = 0; i < receiver.__fields.length; i += 2) {
          if (receiver.__fields[i] === key) {
            idx = i + 1;
            break;
          }
        }
        if (idx >= 0) {
          this.stack.push(receiver.__fields[idx]);
        } else {
          // Create new entry
          receiver.__fields.push(key);
          receiver.__fields.push(0); // default value
          this.stack.push(receiver.__fields[receiver.__fields.length - 1]);
        }
        return;
      }
    }
    
    // Set methods
    if (baseName === "set" || baseName.startsWith("set")) {
      if (methodName === "insert") {
        if (args.length !== 1) throw new RuntimeError("RuntimeError", "insert expects 1 argument");
        if (!receiver.__fields) receiver.__fields = [];
        let val = args[0];
        if (this.isPtrLike(val)) val = this.derefPtr(val, "set insert value");

        if (!receiver.__fields.includes(val)) {
          receiver.__fields.push(val);
        }
        this.stack.push(null);
        return;
      }
      if (methodName === "contains") {
        if (args.length !== 1) throw new RuntimeError("RuntimeError", "contains expects 1 argument");
        if (!receiver.__fields) receiver.__fields = [];
        let val = args[0];
        if (this.isPtrLike(val)) val = this.derefPtr(val, "set contains value");

        this.stack.push(receiver.__fields.includes(val) ? 1 : 0);
        return;
      }
      if (methodName === "size" || methodName === "count") {
        if (!receiver.__fields) receiver.__fields = [];
        this.stack.push(receiver.__fields.length);
        return;
      }
      if (methodName === "empty") {
        if (!receiver.__fields) receiver.__fields = [];
        this.stack.push(receiver.__fields.length === 0 ? 1 : 0);
        return;
      }
      if (methodName === "erase") {
        if (!receiver.__fields) receiver.__fields = [];
        let val = args[0];
        if (this.isPtrLike(val)) val = this.derefPtr(val, "set erase value");
        receiver.__fields = receiver.__fields.filter(v => v !== val);
        this.stack.push(null);
        return;
      }
    }
  }
}

module.exports = VirtualMachine;
