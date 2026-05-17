#include <stdio.h>
#include <stdlib.h>
int main() {
    int n = 10;
    int *s = (int*)malloc(n * sizeof(int));
    for (int i = 0; i < n; i++) s[i] = 1;
    printf("s[0]=%d s[5]=%d\n", s[0], s[5]);
    free(s);
    return 0;
}
