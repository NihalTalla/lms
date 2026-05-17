#ifndef STD_QUEUE_H
#define STD_QUEUE_H

namespace std {

    typedef unsigned long size_t;

    template <typename T>
    class queue {
    public:
        queue();
        queue(const queue<T>& other);
        ~queue();

        queue<T>& operator=(const queue<T>& other);

        // capacity
        bool empty() const;
        size_t size() const;

        // element access
        T& front();
        const T& front() const;

        T& back();
        const T& back() const;

        // modifiers
        void push(const T& value);
        void pop();

    private:
        void* _impl;
        size_t _size;
    };

} // namespace std

#endif // STD_QUEUE_H
