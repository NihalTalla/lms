#ifndef STD_STRING_H
#define STD_STRING_H

namespace std {

    typedef unsigned long size_t;

    class string {
    public:
        // constructors
        string();
        string(const char* s);
        string(const string& other);

        // destructor
        ~string();

        // assignment
        string& operator=(const string& other);
        string& operator=(const char* s);

        // element access
        char& operator[](size_t index);
        const char& operator[](size_t index) const;

        // capacity
        size_t size() const;
        size_t length() const;
        bool empty() const;
        void clear();

        // modifiers
        void push_back(char c);
        void pop_back();

        string& append(const string& other);
        string& append(const char* s);

        // comparison
        bool operator==(const string& other) const;
        bool operator!=(const string& other) const;

        // c-string access
        const char* c_str() const;

    private:
        char* _data;
        size_t _size;
        size_t _capacity;
    };

} // namespace std

#endif // STD_STRING_H
