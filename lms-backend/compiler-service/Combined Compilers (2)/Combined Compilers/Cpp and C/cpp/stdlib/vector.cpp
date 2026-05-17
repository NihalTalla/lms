#ifndef STD_VECTOR_H
#define STD_VECTOR_H

namespace std {

    typedef unsigned long size_t;

    template <typename T>
    class vector {
    public:
        // constructors
        vector();
        vector(size_t n);
        vector(const vector<T>& other);

        // destructor
        ~vector();

        // assignment
        vector<T>& operator=(const vector<T>& other);
        T* data();
        const T* data() const;

        // element access
        T& operator[](size_t index);
        const T& operator[](size_t index) const;

        T& at(size_t index);
        const T& at(size_t index) const;

        T& front();
        const T& front() const;

        T& back();
        const T& back() const;

        // capacity
        bool empty() const;
        size_t size() const;
        size_t capacity() const;
        void reserve(size_t new_cap);
        void clear();

        // modifiers
        void push_back(const T& value);
        void pop_back();

        void resize(size_t new_size);
        void resize(size_t new_size, const T& value);

    private:
        T* _data;
        size_t _size;
        size_t _capacity;
    };

} // namespace std

#endif // STD_VECTOR_H
