// If and Switch statements
const condition: boolean = true;
if (condition) {
  console.log('This is a if statement');
} else if (!condition) {
  console.log('This should not be printed');
} else {
  console.log('This should not be printed');
}

const number: number = Math.floor(Math.random() * 5);
if (number > 5) {
  console.log('This should not be printed');
}

switch (number) {
  case 0:
    console.log('Answer is 0');
    break;
  case 1:
    console.log('Answer is 1');
    break;
  case 2:
    console.log('Answer is 2');
    break;
  case 3:
  default:
    console.log('Answer is something else: ', number);
    break;
}
