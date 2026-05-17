#include <stdio.h>
int fn(int *a, int n) {
    int r = a[0];
    for (int i = 1; i < n; i++) {
        int t = r + a[i];
        r = a[i] > t ? a[i] : t;  /* ternary */
    }
    return r;
}
int main() {
    int arr[] = {1,-2,3,-4,5};
    printf("fn=%d\n", fn(arr, 5));
    return 0;
}
