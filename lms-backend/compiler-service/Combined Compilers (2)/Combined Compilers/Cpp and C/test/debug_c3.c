#include <stdio.h>
int maxSubArray(int *nums, int n) {
    int best = nums[0];
    int cur = nums[0];
    for (int i = 1; i < n; i++) {
        int next = cur + nums[i];
        cur = nums[i] > next ? nums[i] : next;
        best = best > cur ? best : cur;
    }
    return best;
}
int main() {
    int ms[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    printf("maxSub = %d\n", maxSubArray(ms, 9));
    return 0;
}
