// Mix import and #include intentionally

#include <bits/stdc++.h>
#include <vector>
#include <type_traits>

import std.map;
import std.set;

// stdlib is auto-injected via prelude.cpp

int main() {
    // ---------------------------
    // vector + algorithm
    // ---------------------------
    vector<int> v;
    v.push_back(3);
    v.push_back(1);
    v.push_back(2);

    sort(v.data(), v.data() + v.size());

    cout << "vector:";
    int i = 0;
    while (i < v.size()) {
        cout << " " << v[i];
        i = i + 1;
    }
    cout << "\n";

    // ---------------------------
    // map
    // ---------------------------
    map<int, int> mp;
    mp[2] = 20;
    mp[1] = 10;

    cout << "map:";
    cout << " " << mp[1];
    cout << " " << mp[2];
    cout << "\n";

    // ---------------------------
    // set
    // ---------------------------
    set<int> s;
    s.insert(5);
    s.insert(3);

    cout << "set:";
    cout << " " << s.contains(3);
    cout << " " << s.contains(4);
    cout << "\n";

    // ---------------------------
    // string
    // ---------------------------
    string str = "hello";
    str.push_back('!');
    cout << "string: " << str << "\n";

    // ---------------------------
    // type_traits (flattened)
    // ---------------------------
    cout << "is_same:";
    cout << " " << is_same<int, int>::value;
    cout << " " << is_same<int, long>::value;
    cout << "\n";

    // ---------------------------
    // limits (flattened)
    // ---------------------------
    cout << "limits:";
    cout << " " << numeric_limits<int>::min();
    cout << " " << numeric_limits<int>::max();
    cout << "\n";

    return 0;
}
