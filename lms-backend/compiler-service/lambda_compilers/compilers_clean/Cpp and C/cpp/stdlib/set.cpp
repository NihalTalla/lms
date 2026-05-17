#ifndef STD_SET_H
#define STD_SET_H

namespace std {

    typedef unsigned long size_t;

    template <typename Key>
    class set {
    public:
        // types
        typedef Key key_type;

        // constructors
        set();
        set(const set<Key>& other);

        // destructor
        ~set();

        // assignment
        set<Key>& operator=(const set<Key>& other);

        // capacity
        bool empty() const;
        size_t size() const;
        void clear();

        // modifiers
        void insert(const Key& key);
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

#endif // STD_SET_H
