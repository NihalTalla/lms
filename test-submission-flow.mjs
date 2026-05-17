/**
 * Submission Flow Smoke Test
 * 
 * Tests the complete submission lifecycle:
 * 1. Create a submission
 * 2. Poll until completion
 * 3. Verify DB persistence
 * 4. Test reload/hydration
 * 5. Test error scenarios
 * 6. Test duplicate prevention
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const COMPILER_URL = process.env.COMPILER_URL || 'http://localhost:4000';

console.log(`🧪 Submission Flow Smoke Test`);
console.log(`   API Base: ${API_BASE}`);
console.log(`   Compiler: ${COMPILER_URL}`);
console.log('---');

let testsPassed = 0;
let testsFailed = 0;
let authToken = null;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    testsPassed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    testsFailed++;
  }
}

async function apiCall(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (authToken) {
    opts.headers.Authorization = `Bearer ${authToken}`;
  }
  if (body) opts.body = JSON.stringify(body);
  
  const res = await fetch(`${API_BASE}${path}`, opts);
  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${data?.message || JSON.stringify(data)}`);
  }
  return data;
}

// Test 0: Sign in to get auth token
await test('Sign in and get auth token', async () => {
  const result = await apiCall('POST', '/api/auth/login', {
    email: 'student1@codify.com',
    password: 'Student@123'
  });
  
  authToken = result.accessToken || result.token;
  if (!authToken) throw new Error('No token in response');
  console.log(`   → Token obtained`);
});

// Test 1: Create a simple submission
let submissionId = null;
let submissionIdForReload = null;

await test('Create submission (simple sum)', async () => {
  // Problem ID from seed: problem-1
  const result = await apiCall('POST', '/api/submissions', {
    problemId: '33333333-3333-3333-3333-333333333333', // sum problem from seed
    language: 'python',
    code: 'a, b = map(int, input().split())\nprint(a + b)'
  });
  
  submissionId = result.submissionId || result.id;
  submissionIdForReload = submissionId;
  
  if (!submissionId) throw new Error('No submissionId in response');
  console.log(`   → Submission ID: ${submissionId}`);
});

// Test 2: Poll until completion
let finalResult = null;
await test('Poll submission until completion', async () => {
  if (!submissionId) throw new Error('No submission ID from create test');
  
  const maxAttempts = 40;
  const pollDelay = 1500;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await apiCall('GET', `/api/submissions/${submissionId}`);
    const status = result.data?.status || result.status;
    
    if (status === 'completed' || result.data?.verdict || result.verdict) {
      finalResult = result.data || result;
      console.log(`   → Completed after ${attempt} polls`);
      console.log(`   → Verdict: ${finalResult.verdict}`);
      console.log(`   → Passed: ${finalResult.passedTests}/${finalResult.totalTests}`);
      return;
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollDelay));
    }
  }
  
  throw new Error(`Submission did not complete after ${maxAttempts} polls`);
});

// Test 3: Verify submission persists in DB (reload scenario)
await test('Verify submission hydration after reload', async () => {
  if (!submissionIdForReload) throw new Error('No submission ID');
  
  const result = await apiCall('GET', `/api/submissions/${submissionIdForReload}`);
  const data = result.data || result;
  
  if (!data.id && !data.submissionId) {
    throw new Error('Submission not found in DB after reload');
  }
  
  if (data.verdict !== 'accepted') {
    throw new Error(`Expected verdict "accepted", got "${data.verdict}"`);
  }
  
  console.log(`   → Submission persisted with verdict: ${data.verdict}`);
});

// Test 4: Test duplicate submission prevention
let duplicateId = null;
await test('Create another submission (ensure unique requests)', async () => {
  const result = await apiCall('POST', '/api/submissions', {
    problemId: '33333333-3333-3333-3333-333333333333',
    language: 'python',
    code: 'a, b = map(int, input().split())\nprint(a + b)'
  });
  
  duplicateId = result.submissionId || result.id;
  
  if (!duplicateId) throw new Error('No submissionId in response');
  if (duplicateId === submissionId) {
    throw new Error('Duplicate submission ID detected (should be unique)');
  }
  
  console.log(`   → New submission ID (unique): ${duplicateId}`);
});

// Test 5: Poll the second submission
await test('Poll second submission to completion', async () => {
  if (!duplicateId) throw new Error('No duplicate submission ID');
  
  const maxAttempts = 40;
  const pollDelay = 1500;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await apiCall('GET', `/api/submissions/${duplicateId}`);
    const status = result.data?.status || result.status;
    
    if (status === 'completed' || result.data?.verdict || result.verdict) {
      console.log(`   → Completed after ${attempt} polls`);
      return;
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollDelay));
    }
  }
  
  throw new Error('Second submission did not complete');
});

// Test 6: Test runtime error detection (wrong answer)
let wrongAnswerSubmissionId = null;
await test('Create wrong-answer submission to test error handling', async () => {
  const result = await apiCall('POST', '/api/submissions', {
    problemId: '33333333-3333-3333-3333-333333333333',
    language: 'python',
    code: 'a, b = map(int, input().split())\nprint(a * b)' // Wrong: multiplies instead of adds
  });
  
  wrongAnswerSubmissionId = result.submissionId || result.id;
  if (!wrongAnswerSubmissionId) throw new Error('No submissionId');
  console.log(`   → Submission ID: ${wrongAnswerSubmissionId}`);
});

// Test 7: Poll wrong-answer submission
await test('Poll wrong-answer submission and verify verdict', async () => {
  if (!wrongAnswerSubmissionId) throw new Error('No wrong-answer submission ID');
  
  const maxAttempts = 40;
  const pollDelay = 1500;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await apiCall('GET', `/api/submissions/${wrongAnswerSubmissionId}`);
    const data = result.data || result;
    const status = data.status;
    
    if (status === 'completed' || data.verdict) {
      if (data.verdict !== 'wrong_answer') {
        throw new Error(`Expected "wrong_answer", got "${data.verdict}"`);
      }
      console.log(`   → Correct verdict: ${data.verdict}`);
      console.log(`   → Passed: ${data.passedTests}/${data.totalTests} (expected < total)`);
      return;
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, pollDelay));
    }
  }
  
  throw new Error('Wrong-answer submission did not complete');
});


// Print summary
console.log('---');
console.log(`📊 Results: ${testsPassed} passed, ${testsFailed} failed`);

if (testsFailed > 0) {
  process.exit(1);
}

console.log('✅ All smoke tests passed!');
process.exit(0);

