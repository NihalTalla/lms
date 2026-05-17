• Numeric operations (+, -, *, /, //, %, unary -)
• Boolean values (True, False)
• Logical operators (and, or, not)
• Comparison operators (==, !=, <, >, <=, >=)
• Chained comparisons (a < b < c)
• Ternary expressions (a if cond else b)

• Variable assignment and lookup
• Global variables using `global`
• Nonlocal variables using `nonlocal`
• Proper lexical scoping
• Shadowing rules (local > nonlocal > global)

• Print and print_inline output
• Expression statements
• Pass statement

• If / elif / else control flow
• While loops
• For loops using range()
    - range(end)
    - range(start, end)
    - range(start, end, step)
    - Negative step support
• Break and continue (loop-safe, nested-safe)

• Function definitions
• Function calls (value-based calls)
• Recursive functions
• Functions without return value
• Proper return / return value semantics
• Argument passing ($arg0, $arg1, ...)

• Nested functions
• Closures with environment capture
• Nonlocal mutation inside closures

• Lists
    - List creation
    - Indexing (positive & negative)
    - Assignment by index
    - Slicing (positive & negative indices)
    - append()
    - pop() with empty-list guard

• Strings
    - String literals
    - Indexing
    - Slicing

• Built-in functions
    - len()
    - input()
    - int()

• Runtime error framework
    - NameError
    - TypeError
    - IndexError
    - ZeroDivisionError
    - Execution limit protection

• Stack-based virtual machine
• Bytecode execution engine
• Closure-safe CALL / RETURN semantics
• Separate global, local, and closure environments
