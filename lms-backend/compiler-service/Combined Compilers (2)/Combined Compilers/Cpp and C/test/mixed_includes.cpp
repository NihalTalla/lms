// Test mixing #include and import statements
#include <iostream>
#include <vector>
import std.string;
#include <algorithm>

int main() {
    cout << "Testing mixed includes and imports\n";
    
    vector<int> v;
    v.push_back(3);
    v.push_back(1);
    v.push_back(4);
    v.push_back(1);
    v.push_back(5);
    
    sort(v.data(), v.data() + v.size());
    
    cout << "sorted vector:";
    int i = 0;
    while (i < v.size()) {
        cout << " " << v[i];
        i = i + 1;
    }
    cout << "\n";
    
    string msg = "Mixed includes work!";
    cout << msg << "\n";
    
    return 0;
}
