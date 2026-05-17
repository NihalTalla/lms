#include <vector>
#include <map>
#include <iostream>
#include <algorithm>

int main() {
    // Test Vector and Sort
    std::vector<int> v;
    v.push_back(3);
    v.push_back(1);
    v.push_back(2);

    int* p = v.data();
    std::cout << "Before sort: " << p[0] << " " << p[1] << " " << p[2] << "\n";

    std::sort(v.data(), v.data() + v.size());

    p = v.data(); // Re-fetch data pointer just in case
    std::cout << "After sort: " << p[0] << " " << p[1] << " " << p[2] << "\n";

    // Test Map
    std::map<int, int> m;
    m[10] = 100;
    m[20] = 200;

    std::cout << "Map values: " << m[10] << " " << m[20] << "\n";

    return 0;
}
