/**
 * Resource Tracker - Monitors and enforces compiler resource limits
 * Tracks memory usage, execution time, instruction count, and other metrics
 */

const { DEFAULT_LIMITS } = require("../config/limits");

class ResourceTracker {
  constructor(customLimits = {}) {
    this.limits = { ...DEFAULT_LIMITS, ...customLimits };
    
    // Memory tracking
    this.heapMemoryUsed = 0;
    this.stackMemoryUsed = 0;
    this.staticMemoryUsed = 0;
    this.totalMemoryUsed = 0;
    
    // Execution tracking
    this.instructionCount = 0;
    this.executionStartTime = Date.now();
    this.callStackDepth = 0;
    this.callFrameCount = 0;
    
    // Object tracking
    this.objectCount = 0;
    
    // I/O tracking
    this.inputBytesRead = 0;
    this.outputBytesWritten = 0;
  }

  // Memory tracking methods
  allocateHeap(sizeInBytes) {
    const newTotal = this.heapMemoryUsed + sizeInBytes;
    if (newTotal > this.limits.HEAP_MEMORY_LIMIT) {
      throw new Error(
        `OutOfMemoryError: Heap memory limit exceeded. ` +
        `(${newTotal} > ${this.limits.HEAP_MEMORY_LIMIT})`
      );
    }
    if (newTotal > this.limits.TOTAL_MEMORY_LIMIT) {
      throw new Error(
        `OutOfMemoryError: Total memory limit exceeded. ` +
        `(${newTotal} > ${this.limits.TOTAL_MEMORY_LIMIT})`
      );
    }
    this.heapMemoryUsed = newTotal;
    this.totalMemoryUsed += sizeInBytes;
    return true;
  }

  deallocateHeap(sizeInBytes) {
    this.heapMemoryUsed -= sizeInBytes;
  }

  allocateStack(sizeInBytes) {
    const newTotal = this.stackMemoryUsed + sizeInBytes;
    if (newTotal > this.limits.STACK_MEMORY_LIMIT) {
      throw new Error(
        `StackOverflowError: Stack memory limit exceeded. ` +
        `(${newTotal} > ${this.limits.STACK_MEMORY_LIMIT})`
      );
    }
    this.stackMemoryUsed = newTotal;
    return true;
  }

  deallocateStack(sizeInBytes) {
    this.stackMemoryUsed -= sizeInBytes;
  }

  // Execution tracking methods
  recordInstruction() {
    this.instructionCount++;
    if (this.instructionCount > this.limits.INSTRUCTION_COUNT_LIMIT) {
      throw new Error(
        `ExecutionError: Instruction count limit exceeded. ` +
        `(${this.instructionCount} > ${this.limits.INSTRUCTION_COUNT_LIMIT})`
      );
    }
  }

  checkExecutionTime() {
    const elapsed = Date.now() - this.executionStartTime;
    if (elapsed > this.limits.EXECUTION_TIME_LIMIT) {
      throw new Error(
        `ExecutionError: Execution time limit exceeded. ` +
        `(${elapsed}ms > ${this.limits.EXECUTION_TIME_LIMIT}ms)`
      );
    }
  }

  pushCallFrame() {
    this.callStackDepth++;
    this.callFrameCount++;
    
    if (this.callStackDepth > this.limits.STACK_DEPTH_LIMIT) {
      throw new Error(
        `StackOverflowError: Call stack depth limit exceeded. ` +
        `(${this.callStackDepth} > ${this.limits.STACK_DEPTH_LIMIT})`
      );
    }
    if (this.callFrameCount > this.limits.CALL_FRAME_LIMIT) {
      throw new Error(
        `ExecutionError: Call frame limit exceeded. ` +
        `(${this.callFrameCount} > ${this.limits.CALL_FRAME_LIMIT})`
      );
    }
  }

  popCallFrame() {
    this.callStackDepth--;
  }

  // Object tracking methods
  recordObjectCreation() {
    this.objectCount++;
    if (this.objectCount > this.limits.OBJECT_COUNT_LIMIT) {
      throw new Error(
        `OutOfMemoryError: Object count limit exceeded. ` +
        `(${this.objectCount} > ${this.limits.OBJECT_COUNT_LIMIT})`
      );
    }
  }

  // Array validation
  validateArrayLength(length) {
    if (length > this.limits.ARRAY_LENGTH_LIMIT) {
      throw new Error(
        `OutOfMemoryError: Array length limit exceeded. ` +
        `(${length} > ${this.limits.ARRAY_LENGTH_LIMIT})`
      );
    }
  }

  // String validation
  validateStringLength(length) {
    if (length > this.limits.STRING_LENGTH_LIMIT) {
      throw new Error(
        `OutOfMemoryError: String length limit exceeded. ` +
        `(${length} > ${this.limits.STRING_LENGTH_LIMIT})`
      );
    }
  }

  // I/O tracking methods
  recordInput(bytes) {
    this.inputBytesRead += bytes;
    if (this.inputBytesRead > this.limits.INPUT_SIZE_LIMIT) {
      throw new Error(
        `IOError: Input size limit exceeded. ` +
        `(${this.inputBytesRead} > ${this.limits.INPUT_SIZE_LIMIT})`
      );
    }
  }

  recordOutput(bytes) {
    this.outputBytesWritten += bytes;
    if (this.outputBytesWritten > this.limits.OUTPUT_SIZE_LIMIT) {
      throw new Error(
        `IOError: Output size limit exceeded. ` +
        `(${this.outputBytesWritten} > ${this.limits.OUTPUT_SIZE_LIMIT})`
      );
    }
  }

  // Statistics
  getStats() {
    return {
      heapMemoryUsed: this.heapMemoryUsed,
      heapMemoryLimit: this.limits.HEAP_MEMORY_LIMIT,
      stackMemoryUsed: this.stackMemoryUsed,
      stackMemoryLimit: this.limits.STACK_MEMORY_LIMIT,
      totalMemoryUsed: this.totalMemoryUsed,
      totalMemoryLimit: this.limits.TOTAL_MEMORY_LIMIT,
      instructionCount: this.instructionCount,
      instructionLimit: this.limits.INSTRUCTION_COUNT_LIMIT,
      callStackDepth: this.callStackDepth,
      callStackLimit: this.limits.STACK_DEPTH_LIMIT,
      objectCount: this.objectCount,
      objectCountLimit: this.limits.OBJECT_COUNT_LIMIT,
      executionTimeMs: Date.now() - this.executionStartTime,
      executionTimeLimit: this.limits.EXECUTION_TIME_LIMIT
    };
  }
}

module.exports = ResourceTracker;
