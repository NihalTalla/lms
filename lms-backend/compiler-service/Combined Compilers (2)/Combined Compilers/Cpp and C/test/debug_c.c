#include <stdio.h>

int maxSubArray(int *nums, int n) {
    int best = nums[0];
    int cur = nums[0];
    for (int i = 1; i < n; i++) {
        int a = cur + nums[i];
        int b = nums[i];
        if (b > a) cur = b;
        else cur = a;
        if (cur > best) best = cur;
    }
    return best;
}

int main() {
    int ms[9];
    ms[0] = -2; ms[1] = 1; ms[2] = -3; ms[3] = 4; ms[4] = -1;
    ms[5] = 2; ms[6] = 1; ms[7] = -5; ms[8] = 4;
    printf("maxSub = %d\n", maxSubArray(ms, 9));
    return 0;
}
