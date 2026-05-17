#ifndef STD_PAIR_H
#define STD_PAIR_H

namespace std {

    template <typename T1, typename T2>
    struct pair {
        T1 first;
        T2 second;

        pair();
        pair(const T1& a, const T2& b);
        pair(const pair<T1, T2>& other);

        pair<T1, T2>& operator=(const pair<T1, T2>& other);
    };
    template <typename T1, typename T2>
    bool operator==(const pair<T1, T2>& a, const pair<T1, T2>& b) {
        return a.first == b.first && a.second == b.second;
    }

    template <typename T1, typename T2>
    bool operator!=(const pair<T1, T2>& a, const pair<T1, T2>& b) {
        return !(a == b);
    }

    template <typename T1, typename T2>
    bool operator<(const pair<T1, T2>& a, const pair<T1, T2>& b) {
        if (a.first < b.first) return true;
        if (b.first < a.first) return false;
        return a.second < b.second;
    }

    template <typename T1, typename T2>
    bool operator>(const pair<T1, T2>& a, const pair<T1, T2>& b) {
        return b < a;
    }

    template <typename T1, typename T2>
    bool operator<=(const pair<T1, T2>& a, const pair<T1, T2>& b) {
        return !(b < a);
    }

    template <typename T1, typename T2>
    bool operator>=(const pair<T1, T2>& a, const pair<T1, T2>& b) {
        return !(a < b);
    }

} // namespace std

#endif // STD_PAIR_H
