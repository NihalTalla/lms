#ifndef STD_TUPLE_H
#define STD_TUPLE_H

namespace std {

    template <typename T1, typename T2>
    class tuple {
    public:
        tuple();
        tuple(const T1& a, const T2& b);
        tuple(const tuple<T1, T2>& other);

        tuple<T1, T2>& operator=(const tuple<T1, T2>& other);

        T1& get0();
        const T1& get0() const;

        T2& get1();
        const T2& get1() const;

    private:
        T1 _v0;
        T2 _v1;
    };

} // namespace std

#endif // STD_TUPLE_H
