// Test file for import functionality
import std.iostream;
import std.vector;
import std.string;

int main() {
    cout << "Testing imports\n";
    
    vector<int> v;
    v.push_back(10);
    v.push_back(20);
    v.push_back(30);
    
    cout << "vector:";
    int i = 0;
    while (i < v.size()) {
        cout << " " << v[i];
        i = i + 1;
    }
    cout << "\n";
    
    string str = "Hello from imports!";
    cout << "string: " << str << "\n";
    
    return 0;
}
