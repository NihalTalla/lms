#include <stdio.h>
int maxSubArray(int *nums, int n) {
    int best = nums[0];
    int cur = nums[0];
    for (int i = 1; i < n; i++) {
        if (cur + nums[i] > nums[i]) cur = cur + nums[i];
        else cur = nums[i];
        if (cur > best) best = cur;
    }
    return best;
}
int main() {
    int ms[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    int r = maxSubArray(ms, 9);
    printf("maxSub = %d\n", r);
    return 0;
}
