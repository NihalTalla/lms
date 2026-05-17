/*
 * leetcode_c.c — LeetCode-style solutions in NATIVE C syntax (printf/scanf/stdlib)
 * This file tests the C compiler's printf/stdlib/math/string layers.
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

/* 1. Two Sum */
void twoSum(int *nums, int n, int target, int *out) {
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (nums[i] + nums[j] == target) {
                out[0] = i; out[1] = j; return;
            }
    out[0] = -1; out[1] = -1;
}

/* 2. Fibonacci */
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

/* 3. Binary search */
int binarySearch(int *a, int n, int target) {
    int lo = 0, hi = n - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        else if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}

/* 4. Max subarray (Kadane) — no ternary (parser limitation) */
int maxSubArray(int *nums, int n) {
    int best = nums[0];
    int cur = nums[0];
    for (int i = 1; i < n; i++) {
        int add = cur + nums[i];
        if (nums[i] > add) cur = nums[i]; else cur = add;
        if (cur > best) best = cur;
    }
    return best;
}

/* 5. Is palindrome int */
int isPalindromeInt(int x) {
    if (x < 0) return 0;
    int orig = x, rev = 0;
    while (x > 0) { rev = rev * 10 + x % 10; x /= 10; }
    return orig == rev;
}

/* 6. Count primes — trial division, avoids malloc+indexing */
int isPrime(int n) {
    if (n < 2) return 0;
    for (int i = 2; i * i <= n; i++)
        if (n % i == 0) return 0;
    return 1;
}
int countPrimes(int n) {
    int count = 0;
    for (int i = 2; i < n; i++)
        if (isPrime(i)) count++;
    return count;
}

/* 7. GCD */
int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }

/* 8. Selection sort */
void selectionSort(int *a, int n) {
    for (int i = 0; i < n - 1; i++) {
        int minIdx = i;
        for (int j = i + 1; j < n; j++)
            if (a[j] < a[minIdx]) minIdx = j;
        int t = a[i]; a[i] = a[minIdx]; a[minIdx] = t;
    }
}

/* 9. Power */
int myPow(int base, int exp) {
    int result = 1;
    while (exp > 0) { result *= base; exp--; }
    return result;
}

/* 10. Missing number (XOR trick) */
int missingNumber(int *nums, int n) {
    int xorAll = 0;
    for (int i = 0; i <= n; i++) xorAll ^= i;
    for (int i = 0; i < n; i++) xorAll ^= nums[i];
    return xorAll;
}

/* 11. Linked list sum */
struct Node { int v; struct Node* next; };
struct Node* newNode(int v) {
    struct Node* n = (struct Node*)malloc(sizeof(struct Node));
    n->v = v; n->next = 0; return n;
}
int listSum(struct Node* h) {
    int s = 0;
    while (h) { s += h->v; h = h->next; }
    return s;
}
void listFree(struct Node* h) {
    while (h) { struct Node* n = h->next; free(h); h = n; }
}

int main() {
    /* 1. Two Sum */
    int nums[] = {2, 7, 11, 15};
    int out[2];
    twoSum(nums, 4, 9, out);
    printf("TwoSum: [%d, %d]\n", out[0], out[1]);

    /* 2. printf number formats */
    printf("Pi ~ %.4f\n", 3.14159265);
    printf("Hex 255 = %x\n", 255);
    printf("Char: %c\n", 65);
    printf("Int: %d\n", -42);
    printf("Uint: %u\n", 42);

    /* 3. Fibonacci */
    int f = fib(10);
    printf("fib(10) = %d\n", f);

    /* 4. Binary search */
    int sorted[] = {1, 3, 5, 7, 9, 11, 13};
    int bs1 = binarySearch(sorted, 7, 7);
    int bs2 = binarySearch(sorted, 7, 6);
    printf("bs(7)  = %d\n", bs1);
    printf("bs(6)  = %d\n", bs2);

    /* 5. Max subarray */
    int ms[] = {-2, 1, -3, 4, -1, 2, 1, -5, 4};
    int maxSub = maxSubArray(ms, 9);
    printf("maxSub = %d\n", maxSub);

    /* 6. Palindrome */
    printf("isPalin(121) = %d\n", isPalindromeInt(121));
    printf("isPalin(123) = %d\n", isPalindromeInt(123));

    /* 7. Count primes */
    int primes = countPrimes(20);
    printf("primes<20 = %d\n", primes);

    /* 8. GCD */
    printf("gcd(48,18) = %d\n", gcd(48, 18));

    /* 9. Selection sort */
    int arr[] = {64, 25, 12, 22, 11};
    selectionSort(arr, 5);
    printf("sorted: %d %d %d %d %d\n", arr[0], arr[1], arr[2], arr[3], arr[4]);

    /* 10. abs from stdlib */
    printf("abs(-42) = %d\n", abs(-42));

    /* 11. Power */
    int pw = myPow(2, 10);
    printf("2^10 = %d\n", pw);

    /* 12. Missing number */
    int mn[] = {3, 0, 1};
    printf("missing = %d\n", missingNumber(mn, 3));

    /* 13. Math functions */
    printf("sqrt(16) = %.1f\n", sqrt(16.0));
    printf("pow(2,8) = %.0f\n", pow(2.0, 8.0));

    /* 14. String functions */
    printf("strlen = %d\n", strlen("LeetCode"));

    /* 15. Linked list */
    struct Node* head = newNode(10);
    head->next = newNode(20);
    head->next->next = newNode(12);
    printf("listSum = %d\n", listSum(head));
    listFree(head);

    /* 16. Putchar */
    putchar('O'); putchar('K'); putchar('\n');

    /* 17. Multiple format args */
    printf("%d + %d = %d\n", 17, 25, 17 + 25);

    printf("ALL C DONE\n");
    return 0;
}
