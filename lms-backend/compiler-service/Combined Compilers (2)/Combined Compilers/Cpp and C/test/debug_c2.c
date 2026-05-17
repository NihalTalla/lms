#include <stdio.h>

int main() {
    int ms[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    printf("ms[0]=%d ms[3]=%d\n", ms[0], ms[3]);
    int sum = 0;
    for (int i = 0; i < 9; i++) sum += ms[i];
    printf("sum=%d\n", sum);
    return 0;
}
