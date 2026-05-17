#ifndef STD_TYPE_TRAITS_H
#define STD_TYPE_TRAITS_H

namespace std {

    template <typename T, T v>
    struct integral_constant {
        static const T value = v;
        typedef T value_type;
        typedef integral_constant<T, v> type;
    };

    typedef integral_constant<bool, true> true_type;
    typedef integral_constant<bool, false> false_type;

    // is_integral
    template <typename T>
    struct is_integral : false_type {};

    template <> struct is_integral<int> : true_type {};
    template <> struct is_integral<long> : true_type {};
    template <> struct is_integral<long long> : true_type {};
    template <> struct is_integral<unsigned int> : true_type {};
    template <> struct is_integral<unsigned long> : true_type {};
    template <> struct is_integral<unsigned long long> : true_type {};
    template <> struct is_integral<char> : true_type {};

    // is_same
    template <typename T, typename U>
    struct is_same : false_type {};

    template <typename T>
    struct is_same<T, T> : true_type {};

} // namespace std

#endif // STD_TYPE_TRAITS_H
