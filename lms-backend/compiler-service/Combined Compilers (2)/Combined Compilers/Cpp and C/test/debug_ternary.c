#include <stdio.h>
int max(int a, int b) {
    int r;
    if (a > b) r = a; else r = b;
    return r;
}
int main() {
    printf("max=%d\n", max(5,3));
    return 0;
}
