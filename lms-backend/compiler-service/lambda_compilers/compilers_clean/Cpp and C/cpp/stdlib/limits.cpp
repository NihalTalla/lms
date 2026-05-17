#ifndef STD_LIMITS_H
#define STD_LIMITS_H

namespace std {

    template <typename T>
    class numeric_limits {
    public:
        static T min();
        static T max();
    };

    template <>
    class numeric_limits<int> {
    public:
        static int min() { return -2147483648; }
        static int max() { return 2147483647; }
    };

    template <>
    class numeric_limits<long long> {
    public:
        static long long min() { return -9223372036854775807LL - 1; }
        static long long max() { return 9223372036854775807LL; }
    };

    template <>
    class numeric_limits<unsigned int> {
    public:
        static unsigned int min() { return 0; }
        static unsigned int max() { return 4294967295U; }
    };

    template <>
    class numeric_limits<unsigned long long> {
    public:
        static unsigned long long min() { return 0; }
        static unsigned long long max() { return 18446744073709551615ULL; }
    };

} // namespace std

#endif // STD_LIMITS_H
