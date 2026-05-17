#ifndef STD_ALGORITHM_H
#define STD_ALGORITHM_H

namespace std {

    typedef unsigned long size_t;

    // min / max
    template <typename T>
    const T& min(const T& a, const T& b) {
        return (b < a) ? b : a;
    }

    template <typename T>
    const T& max(const T& a, const T& b) {
        return (a < b) ? b : a;
    }

    // swap
    template <typename T>
    void swap(T& a, T& b) {
        T tmp = a;
        a = b;
        b = tmp;
    }

    // NOTE: Template functions are not instantiated by this compiler yet.
    // Provide concrete helpers used by tests.

    void sort(int* begin, int* end) {
        int* i = begin;
        while (i != end) {
            int* j = i + 1;
            while (j != end) {
                if (*j < *i) {
                    int tmp = *i;
                    *i = *j;
                    *j = tmp;
                }
                j = j + 1;
            }
            i = i + 1;
        }
    }

} // namespace std

#endif // STD_ALGORITHM_H
