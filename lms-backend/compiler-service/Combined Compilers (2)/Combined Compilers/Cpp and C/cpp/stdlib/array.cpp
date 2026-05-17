#ifndef STD_ARRAY_H
#define STD_ARRAY_H

namespace std {

    typedef unsigned long size_t;

    template <typename T, size_t N>
    class array {
    public:
        // element access
        T& operator[](size_t index);
        const T& operator[](size_t index) const;

        T& front();
        const T& front() const;

        T& back();
        const T& back() const;

        // capacity
        size_t size() const;
        bool empty() const;

        // data access
        T* data();
        const T* data() const;

    private:
        T _data[N];
    };

} // namespace std

#endif // STD_ARRAY_H
