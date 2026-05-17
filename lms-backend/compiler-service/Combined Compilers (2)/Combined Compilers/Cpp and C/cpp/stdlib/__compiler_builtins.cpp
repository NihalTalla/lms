#ifndef __COMPILER_BUILTINS_H
#define __COMPILER_BUILTINS_H

// This header defines compiler-recognized builtin functions.
// These functions are NEVER implemented in headers.
// The compiler backend / runtime must provide them.

namespace __compiler {

    /*
     * ============================
     *  Program lifecycle
     * ============================
     */

    // Called before main (optional)
    void init_runtime();

    // Called after main (optional)
    void shutdown_runtime();


    /*
     * ============================
     *  Memory management
     * ============================
     */

    // Raw heap allocation
    void* malloc(unsigned long size);
    void  free(void* ptr);

    // C++-style allocation
    void* operator_new(unsigned long size);
    void  operator_delete(void* ptr);


    /*
     * ============================
     *  Integer I/O
     * ============================
     */

    void print_int(int value);
    void print_long(long value);
    void print_long_long(long long value);

    void print_uint(unsigned int value);
    void print_ulong(unsigned long value);
    void print_ulong_long(unsigned long long value);

    int        read_int();
    long       read_long();
    long long  read_long_long();

    unsigned int       read_uint();
    unsigned long      read_ulong();
    unsigned long long read_ulong_long();


    /*
     * ============================
     *  Floating-point I/O
     * ============================
     */

    void print_float(float value);
    void print_double(double value);
    void print_long_double(long double value);

    float       read_float();
    double      read_double();
    long double read_long_double();


    /*
     * ============================
     *  Character & string I/O
     * ============================
     */

    void print_char(char value);
    void print_cstr(const char* str);

    char  read_char();
    void  read_cstr(char* buffer, unsigned long max_len);


    /*
     * ============================
     *  String runtime helpers
     * ============================
     */

    unsigned long strlen(const char* str);
    void strcpy(char* dst, const char* src);
    int  strcmp(const char* a, const char* b);


    /*
     * ============================
     *  Vector runtime helpers
     * ============================
     */

    void* vector_create(unsigned long element_size);
    void  vector_destroy(void* vec);

    void  vector_push_back(void* vec, const void* elem);
    void  vector_pop_back(void* vec);

    void* vector_data(void* vec);
    unsigned long vector_size(void* vec);
    unsigned long vector_capacity(void* vec);

    void  vector_reserve(void* vec, unsigned long new_cap);
    void  vector_clear(void* vec);


    /*
     * ============================
     *  Map / Set runtime helpers
     * ============================
     */

    void* map_create();
    void  map_destroy(void* map);

    void  map_insert(void* map, const void* key, const void* value);
    void* map_find(void* map, const void* key);
    void  map_erase(void* map, const void* key);
    unsigned long map_size(void* map);

    void* set_create();
    void  set_destroy(void* set);

    void  set_insert(void* set, const void* key);
    int   set_contains(void* set, const void* key);
    void  set_erase(void* set, const void* key);
    unsigned long set_size(void* set);


    /*
     * ============================
     *  Queue / Stack helpers
     * ============================
     */

    void* queue_create(unsigned long element_size);
    void  queue_destroy(void* q);
    void  queue_push(void* q, const void* elem);
    void  queue_pop(void* q);
    void* queue_front(void* q);
    void* queue_back(void* q);
    unsigned long queue_size(void* q);

    void* stack_create(unsigned long element_size);
    void  stack_destroy(void* s);
    void  stack_push(void* s, const void* elem);
    void  stack_pop(void* s);
    void* stack_top(void* s);
    unsigned long stack_size(void* s);


    /*
     * ============================
     *  Algorithm helpers
     * ============================
     */

    // Generic sort for POD types
    void sort(void* data,
              unsigned long count,
              unsigned long element_size,
              int (*cmp)(const void*, const void*));


    /*
     * ============================
     *  Diagnostics / debug
     * ============================
     */

    void panic(const char* message);
    void assert_fail(const char* expr,
                     const char* file,
                     int line);

} // namespace __compiler

#endif // __COMPILER_BUILTINS_H
