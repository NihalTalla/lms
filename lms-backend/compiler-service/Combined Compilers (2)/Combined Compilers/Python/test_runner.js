// Simple test runner for Python compiler
const fs = require('fs');
const path = require('path');

const lexer = require('./python/lexer');
const Parser = require('./python/parser');
const irgen = require('./python/irgen');
const lowerIR = require('./ir/ir_lower');
const VM = require('./vm/vm');

// Get file from command line arguments
const fileName = process.argv[2];
if (!fileName) {
    console.error('Usage: node test_runner.js <file.py>');
    process.exit(1);
}

const filePath = path.join(__dirname, fileName);
if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
}

const code = fs.readFileSync(filePath, 'utf8');

console.log(`---------- Compiling ${fileName} ----------`);

try {
    // Pipeline
    console.log('Step 1: Lexing...');
    const tokens = lexer(code);          // 1. Lex
    console.log('✓ Tokens generated:', tokens.length);
    
    console.log('Step 2: Parsing...');
    const parser = new Parser(tokens);   // 2. Parse
    const ast = parser.parse();          // 3. AST
    console.log('✓ AST generated:', ast.length, 'statements');
    
    console.log('Step 3: IR Generation...');
    const ir = irgen(ast);               // 4. AST → IR
    console.log('✓ IR generated with', ir.instructions.length, 'instructions');
    
    console.log('Step 4: Bytecode Generation...');
    const bytecode = lowerIR(ir);        // 5. IR → Bytecode
    console.log('✓ Bytecode generated with', bytecode.length, 'instructions');
    
    // Execute with timeout
    console.log('\n--- OUTPUT ---');
    // Default limits suitable for LMS/judging; can be tuned later.
    const vm = new VM(bytecode, {
        maxSteps: 200000,
        maxTimeMs: 2000,
        maxStack: 20000,
        maxFrames: 2000,
        maxHeapCells: 2_000_000
    });
    
    // Set a timeout to detect hanging
    const timeout = setTimeout(() => {
        console.error('\n❌ TIMEOUT: Execution took too long (>30 seconds)');
        console.error(`   Current IP: ${vm.ip}/${bytecode.length}`);
        console.error(`   Steps executed: ${vm.steps}`);
        if (vm.ip < bytecode.length) {
            const [op, a, b, c] = bytecode[vm.ip] || ['UNKNOWN'];
            console.error(`   Stuck at instruction: ${op}`, a, b, c);
        }
        process.exit(1);
    }, 30000);
    
    try {
        vm.run();
        clearTimeout(timeout);
        console.log('\n✅ Execution completed successfully');
    } catch (execError) {
        clearTimeout(timeout);
        throw execError;
    }
} catch (e) {
    console.error('\n❌ Error during compilation/execution:');
    console.error(e.message);
    if (e.stack) {
        console.error(e.stack);
    }
    process.exit(1);
}