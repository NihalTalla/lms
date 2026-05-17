/**
 * Compiler Configuration - Limits and Import Order
 * Defines all resource limits and import statement ordering rules
 */

// Import Package Order (from java.lang to user-defined)
const IMPORT_ORDER = [
  "java.lang",
  "java.util",
  "java.io",
  "java.nio.file",
  "java.nio.charset",
  "java.time",
  "java.math",
  "java.util.concurrent",
  "java.util.function",
  "java.util.stream",
  "java.lang.annotation",
  "java.lang.reflect",
  "java.net",
  "java.awt",
  "javax.swing",
  "java.sql"
];

// Memory and Resource Limits (in bytes or count units)
const DEFAULT_LIMITS = {
  // Memory Limits
  TOTAL_MEMORY_LIMIT: 256 * 1024 * 1024,        // 256 MB - Total memory available
  HEAP_MEMORY_LIMIT: 128 * 1024 * 1024,         // 128 MB - Heap allocation limit
  STACK_MEMORY_LIMIT: 32 * 1024 * 1024,         // 32 MB - Stack memory limit
  STACK_DEPTH_LIMIT: 10000,                     // Max call stack depth
  CALL_FRAME_LIMIT: 5000,                       // Max concurrent call frames
  STATIC_MEMORY_LIMIT: 16 * 1024 * 1024,        // 16 MB - Static fields storage
  
  // Object and Array Limits
  OBJECT_COUNT_LIMIT: 1000000,                  // Max objects on heap
  ARRAY_LENGTH_LIMIT: 10000000,                 // Max single array length
  STRING_LENGTH_LIMIT: 1000000,                 // Max string length (chars)
  
  // Execution Limits
  INSTRUCTION_COUNT_LIMIT: 10000000,            // Max instructions executed
  EXECUTION_TIME_LIMIT: 60000,                  // Max execution time (ms)
  
  // I/O Limits
  INPUT_SIZE_LIMIT: 10 * 1024 * 1024,           // 10 MB - Max input size
  OUTPUT_SIZE_LIMIT: 10 * 1024 * 1024,          // 10 MB - Max output size
  ERROR_MESSAGE_SIZE_LIMIT: 10000               // Max error message length
};

// Built-in packages (always available, no import needed)
const BUILTIN_PACKAGES = {
  "java.lang": [
    "Object", "String", "Integer", "Boolean", "Character", "Float", "Double",
    "Long", "Short", "Byte", "Math", "System", "Exception", "RuntimeException",
    "Error", "Throwable", "Class", "Void"
  ],
  "java.util": [
    "ArrayList", "HashMap", "HashSet", "TreeSet", "LinkedList", "Vector",
    "Stack", "Queue", "PriorityQueue", "Deque", "LinkedHashMap"
  ],
  "java.io": [
    "File", "FileReader", "FileWriter", "BufferedReader", "BufferedWriter",
    "PrintWriter", "InputStream", "OutputStream", "IOException"
  ]
};

module.exports = {
  IMPORT_ORDER,
  DEFAULT_LIMITS,
  BUILTIN_PACKAGES
};
