#ifndef STD_STACK_H
#define STD_STACK_H

namespace std {

    typedef unsigned long size_t;

    template <typename T>
    class stack {
    public:
        stack();
        stack(const stack<T>& other);
        ~stack();

        stack<T>& operator=(const stack<T>& other);

        // capacity
        bool empty() const;
        size_t size() const;

        // element access
        T& top();
        const T& top() const;

        // modifiers
        void push(const T& value);
        void pop();

    private:
        void* _impl;
        size_t _size;
    };

} // namespace std

#endif // STD_STACK_H
