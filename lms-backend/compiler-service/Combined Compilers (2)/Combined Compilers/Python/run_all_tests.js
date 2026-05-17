// Run all test files and check results
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const testFiles = [
    // Root level tests
    'test_quick.py',
    'test_class.py',
    'test_super.py',
    'test_comprehensions.py',
    'test_v21_complete.py',
    
    // Test directory tests
    'test/test_v1_features.py',
    'test/test_dict.py',
    'test/test_tuple.py',
    'test/test_set.py',
    'test/test_for.py',
    'test/test_exceptions.py',
    'test/test_loop_else.py',
    'test/test_slice_assign.py',
    'test/test_step_slice.py',
    'test/test_annotations.py',
];

const results = {
    passed: [],
    failed: [],
    errors: []
};

console.log('='.repeat(60));
console.log('RUNNING ALL TEST FILES');
console.log('='.repeat(60));
console.log();

testFiles.forEach((testFile, index) => {
    const filePath = path.join(__dirname, testFile);
    
    if (!fs.existsSync(filePath)) {
        console.log(`⏭️  [${index + 1}/${testFiles.length}] ${testFile} - FILE NOT FOUND`);
        results.failed.push({ file: testFile, reason: 'File not found' });
        return;
    }
    
    try {
        console.log(`\n[${index + 1}/${testFiles.length}] Testing: ${testFile}`);
        console.log('-'.repeat(60));
        
        const output = execSync(`node test_runner.js "${testFile}"`, {
            encoding: 'utf8',
            cwd: __dirname,
            stdio: 'pipe'
        });
        
        if (output.includes('✅ Execution completed successfully')) {
            console.log(`✅ PASSED: ${testFile}`);
            results.passed.push(testFile);
        } else if (output.includes('❌ Error')) {
            console.log(`❌ FAILED: ${testFile}`);
            const errorMatch = output.match(/Error: ([^\n]+)/);
            const errorMsg = errorMatch ? errorMatch[1] : 'Unknown error';
            results.failed.push({ file: testFile, reason: errorMsg });
            console.log(`   Reason: ${errorMsg}`);
        } else {
            console.log(`⚠️  UNKNOWN STATUS: ${testFile}`);
            results.failed.push({ file: testFile, reason: 'Unknown status' });
        }
    } catch (error) {
        console.log(`❌ ERROR: ${testFile}`);
        const errorMsg = error.message.split('\n')[0];
        results.errors.push({ file: testFile, error: errorMsg });
        console.log(`   Error: ${errorMsg}`);
    }
});

console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Passed: ${results.passed.length}`);
console.log(`❌ Failed: ${results.failed.length}`);
console.log(`💥 Errors: ${results.errors.length}`);
console.log(`📊 Total: ${testFiles.length}`);

if (results.passed.length > 0) {
    console.log('\n✅ PASSED TESTS:');
    results.passed.forEach(f => console.log(`   - ${f}`));
}

if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.failed.forEach(f => console.log(`   - ${f.file}: ${f.reason}`));
}

if (results.errors.length > 0) {
    console.log('\n💥 ERRORS:');
    results.errors.forEach(e => console.log(`   - ${e.file}: ${e.error}`));
}

console.log('\n' + '='.repeat(60));
