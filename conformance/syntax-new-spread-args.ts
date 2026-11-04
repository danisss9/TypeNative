// new C(...args): spreading an array into a constructor's argument list
class Box {
  items: number[];
  tag: string;
  constructor(...items: number[]) {
    this.items = items;
    this.tag = 'box';
  }
}

const nums = [1, 2, 3];
const box = new Box(...nums);
assert(box.items.length === 3 && box.items[2] === 3, 'spread into new');
assert(box.tag === 'box', 'fields after spread constructor');

function pair(): [string, number] {
  return ['two', 2];
}
const [label, count] = pair();
const boxes = [new Box(...nums), new Box(9)];
assert(boxes[0].items.length === 3 && boxes[1].items.length === 1, 'two spread constructions');
assert(label === 'two' && count === 2, 'destructuring still works');
