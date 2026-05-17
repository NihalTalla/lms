#ifndef STD_MAP_H
#define STD_MAP_H

namespace std {

    typedef unsigned long size_t;

    template <typename Key, typename T>
    class map {
    public:
        // types
        typedef Key key_type;
        typedef T mapped_type;

        // constructors
        map();
        map(const map<Key, T>& other);

        // destructor
        ~map();

        // assignment
        map<Key, T>& operator=(const map<Key, T>& other);

        // element access
        T& operator[](const Key& key);

        // capacity
        bool empty() const;
        size_t size() const;
        void clear();

        // modifiers
        void insert(const Key& key, const T& value);
        void erase(const Key& key);

        // lookup
        bool contains(const Key& key) const;
        size_t count(const Key& key) const;

    private:
        // opaque internal representation
        void* _impl;
        size_t _size;
    };

} // namespace std

#endif // STD_MAP_H
