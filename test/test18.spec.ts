// Default parameter values

function greeter(name: string = 'world'): string {
  return 'hello ' + name;
}

assert(greeter() === 'hello world', 'function default param — omitted argument');
assert(greeter('TypeNative') === 'hello TypeNative', 'function default param — provided argument');

function sum(a: number = 1, b: number = 2): number {
  return a + b;
}

assert(sum() === 3, 'multiple defaults — both omitted');
assert(sum(4) === 6, 'multiple defaults — one provided');
assert(sum(4, 5) === 9, 'multiple defaults — all provided');

const withArrowDefault = (value: string = 'fallback'): string => {
  return value;
};

assert(withArrowDefault() === 'fallback', 'arrow default param — omitted');
assert(withArrowDefault('ok') === 'ok', 'arrow default param — provided');

class Stepper {
  start: number;

  constructor(start: number = 10) {
    this.start = start;
  }

  add(step: number = 1): number {
    return this.start + step;
  }
}

const stepper1 = new Stepper();
const stepper2 = new Stepper(7);

assert(stepper1.start === 10, 'constructor default param — omitted');
assert(stepper2.start === 7, 'constructor default param — provided');
assert(stepper1.add() === 11, 'method default param — omitted');
assert(stepper1.add(5) === 15, 'method default param — provided');
