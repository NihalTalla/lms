int fn(int *a, int n) {
    int r = a[0];
    for (int i = 1; i < n; i++) {
        int t = r + a[i];
        r = a[i] > t ? a[i] : t;
    }
    return r;
}
int main() {
    int arr[] = {1,2,3};
    int result = fn(arr, 3);
    print(result);
    return 0;
}
