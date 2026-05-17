// Test file for include/import functionality
#include <bits/stdc++.h>
#include "math_utils.h"
#include "utils.hpp"

// Test that include guards work - include the same header twice
#include "math_utils.h"

int main() {
    cout << "Testing includes and imports\n";
    
    // Test functions from math_utils.h
    int x = 5;
    cout << "square(" << x << ") = " << square(x) << "\n";
    cout << "cube(" << x << ") = " << cube(x) << "\n";
    
    // Test functions from utils.hpp
    int a = 10;
    int b = 20;
    cout << "add(" << a << ", " << b << ") = " << add(a, b) << "\n";
    cout << "multiply(" << a << ", " << b << ") = " << multiply(a, b) << "\n";
    
    // Test std includes
    vector<int> v;
    v.push_back(1);
    v.push_back(2);
    v.push_back(3);
    cout << "vector size: " << v.size() << "\n";
    
    return 0;
}
