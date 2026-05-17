// leetcode_cpp.cpp — LeetCode-style problems in NATIVE C++ syntax
// Adapted to this compiler's supported subset: no ref params, no range-for,
// no --, no +=, no initializer-list returns

#include <bits/stdc++.h>
#include <vector>
#include <algorithm>

import std.map;
import std.set;

// ── 1. Fibonacci ──────────────────────────────────────────────────────────────
int fib(int n) {
    if (n <= 1) return n;
    return fib(n-1) + fib(n-2);
}

// ── 2. Max subarray (Kadane) ─────────────────────────────────────────────────
int maxSubArray(vector<int> nums) {
    int best = nums[0];
    int cur = nums[0];
    int n = nums.size();
    for (int i = 1; i < n; i++) {
        int add = cur + nums[i];
        if (nums[i] > add) cur = nums[i]; else cur = add;
        if (cur > best) best = cur;
    }
    return best;
}

// ── 3. Is palindrome string ────────────────────────────────────────────────────
bool isPalindrome(string s) {
    int l = 0;
    int r = (int)s.size() - 1;
    while (l < r) {
        if (s[l] != s[r]) return false;
        l = l + 1;
        r = r - 1;
    }
    return true;
}

// ── 4. GCD ─────────────────────────────────────────────────────────────────
int gcd(int a, int b) {
    if (b == 0) return a;
    return gcd(b, a % b);
}

// ── 5. Count elements in range ─────────────────────────────────────────────
int countInRange(vector<int> v, int lo, int hi) {
    int cnt = 0;
    int n = v.size();
    for (int i = 0; i < n; i++) {
        if (v[i] >= lo && v[i] <= hi) cnt = cnt + 1;
    }
    return cnt;
}

// ── 6. Majority element (O(n^2)) ────────────────────────────────────────────
int majorityElement(vector<int> nums) {
    int n = (int)nums.size();
    int best = nums[0];
    int bestCnt = 0;
    for (int i = 0; i < n; i++) {
        int cnt = 0;
        for (int j = 0; j < n; j++) {
            if (nums[j] == nums[i]) cnt = cnt + 1;
        }
        if (cnt > bestCnt) { bestCnt = cnt; best = nums[i]; }
    }
    return best;
}

// ── 7. Binary search ──────────────────────────────────────────────────────────
int binarySearch(vector<int> a, int target) {
    int lo = 0;
    int hi = (int)a.size() - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

// ─────────────────────────── main ────────────────────────────────────────────
int main() {
    // 1. Two Sum (inline, avoids ref params)
    vector<int> nums;
    nums.push_back(2);
    nums.push_back(7);
    nums.push_back(11);
    nums.push_back(15);
    int a0 = -1;
    int a1 = -1;
    for (int i = 0; i < (int)nums.size(); i++) {
        for (int j = i+1; j < (int)nums.size(); j++) {
            if (nums[i] + nums[j] == 9) {
                a0 = i;
                a1 = j;
            }
        }
    }
    cout << "TwoSum: " << a0 << " " << a1 << "\n";

    // 2. Fibonacci
    cout << "fib(10) = " << fib(10) << "\n";

    // 3. Max subarray
    vector<int> ms;
    ms.push_back(-2); ms.push_back(1); ms.push_back(-3);
    ms.push_back(4); ms.push_back(-1); ms.push_back(2);
    ms.push_back(1); ms.push_back(-5); ms.push_back(4);
    cout << "maxSub = " << maxSubArray(ms) << "\n";

    // 4. Palindrome
    cout << "isPalin(racecar) = " << isPalindrome("racecar") << "\n";
    cout << "isPalin(hello)   = " << isPalindrome("hello") << "\n";

    // 5. GCD
    cout << "gcd(48,18) = " << gcd(48, 18) << "\n";

    // 6. countInRange
    vector<int> v;
    v.push_back(1); v.push_back(2); v.push_back(3);
    v.push_back(4); v.push_back(5); v.push_back(6);
    v.push_back(7); v.push_back(8);
    cout << "inRange[3,6] = " << countInRange(v, 3, 6) << "\n";

    // 7. Majority element
    vector<int> maj;
    maj.push_back(2); maj.push_back(2); maj.push_back(1);
    maj.push_back(1); maj.push_back(1); maj.push_back(2); maj.push_back(2);
    cout << "majority = " << majorityElement(maj) << "\n";

    // 8. Binary search
    vector<int> sorted;
    sorted.push_back(1); sorted.push_back(3); sorted.push_back(5);
    sorted.push_back(7); sorted.push_back(9); sorted.push_back(11);
    cout << "bs(7)  = " << binarySearch(sorted, 7) << "\n";
    cout << "bs(6)  = " << binarySearch(sorted, 6) << "\n";

    // 9. String operations
    string s = "LeetCode";
    cout << "len = " << s.size() << "\n";
    s.push_back('!');
    cout << "appended: " << s << "\n";

    // 10. Vector sort
    vector<int> vec;
    vec.push_back(30); vec.push_back(10); vec.push_back(20);
    sort(vec.data(), vec.data() + vec.size());
    cout << "sorted[0] = " << vec[0] << "\n";
    cout << "v.size = " << vec.size() << "\n";

    // 11. Map operations
    map<int,int> mp;
    mp[1] = 100;
    mp[2] = 200;
    mp[3] = 300;
    cout << "mp[2] = " << mp[2] << "\n";

    // 12. Set operations
    set<int> st;
    st.insert(1); st.insert(2); st.insert(3);
    st.insert(2); st.insert(1);
    cout << "st size = " << st.size() << "\n";
    cout << "st.contains(2) = " << st.contains(2) << "\n";

    // 13. While loop accumulate
    int sum = 0;
    int ni = 0;
    while (ni < (int)nums.size()) {
        sum = sum + nums[ni];
        ni = ni + 1;
    }
    cout << "sum = " << sum << "\n";

    // 14. Nested for loops
    int pairs = 0;
    for (int i = 0; i < 5; i++) {
        for (int j = i+1; j < 5; j++) {
            pairs = pairs + 1;
        }
    }
    cout << "pairs = " << pairs << "\n";

    // 15. Numeric limits
    cout << "INT_MAX = " << numeric_limits<int>::max() << "\n";

    // 16. Print vector elements
    vector<int> pv;
    pv.push_back(10); pv.push_back(20); pv.push_back(30);
    int pi = 0;
    cout << "vec:";
    while (pi < (int)pv.size()) {
        cout << " " << pv[pi];
        pi = pi + 1;
    }
    cout << "\n";

    cout << "ALL CPP DONE" << "\n";
    return 0;
}
