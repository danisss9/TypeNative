let arr: number[] = [1, 1, 1, 1, 1, 1, 1, 1, 1];

arr.push(1);

for (let i = 0; i < arr.length; i++) {
  arr[i] = arr[i] + i;
}

for (let i = 0; i < arr.length; i++) {
  console.log(arr[i]);
}
