#ifndef STD_IOSTREAM_H
#define STD_IOSTREAM_H

namespace std {

    typedef unsigned long size_t;

    // Forward declarations
    class istream;
    class ostream;
    class string;
    // Base stream class (empty on purpose)
    class ios {
    public:
        ios() {}
        ~ios() {}
    };
    
    // Output stream
    class ostream : public ios {
    public:
        ostream() {}
        ~ostream() {}

        // output operators (declarations only - lowered to PRINT_INLINE by compiler)
        ostream& operator<<(int value);
        ostream& operator<<(long value);
        ostream& operator<<(long long value);
        ostream& operator<<(const string& value);

        ostream& operator<<(unsigned int value);
        ostream& operator<<(unsigned long value);
        ostream& operator<<(unsigned long long value);

        ostream& operator<<(char value);
        ostream& operator<<(const char* value);

        ostream& operator<<(float value);
        ostream& operator<<(double value);
        ostream& operator<<(long double value);
    };

    // Input stream
    class istream : public ios {
    public:
        istream() {}
        ~istream() {}

        // input operators
        istream& operator>>(int& value);
        istream& operator>>(long& value);
        istream& operator>>(long long& value);
        istream& operator>>(string& value);
        istream& operator>>(unsigned int& value);
        istream& operator>>(unsigned long& value);
        istream& operator>>(unsigned long long& value);

        istream& operator>>(char& value);
        istream& operator>>(char* value);

        istream& operator>>(float& value);
        istream& operator>>(double& value);
        istream& operator>>(long double& value);
    };

    // Standard streams
    extern ostream cout;
    extern istream cin;
    extern ostream cerr;

} // namespace std

#endif // STD_IOSTREAM_H
