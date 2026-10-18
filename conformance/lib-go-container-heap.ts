import * as heap from 'go:container/heap';
import * as sort from 'go:sort';

// A priority queue: a TS class implementing heap.Interface (Go calls its
// methods through an adapter with Len() int, Less(i, j int) bool, …)
interface Task {
  name: string;
  priority: number;
}

class TaskQueue implements heap.Interface {
  tasks: Task[] = [];
  Len(): number {
    return this.tasks.length;
  }
  Less(i: number, j: number): boolean {
    return this.tasks[i].priority < this.tasks[j].priority;
  }
  Swap(i: number, j: number): void {
    const t = this.tasks[i];
    this.tasks[i] = this.tasks[j];
    this.tasks[j] = t;
  }
  Push(x: any): void {
    this.tasks.push(x as Task);
  }
  Pop(): any {
    const last = this.tasks[this.tasks.length - 1];
    this.tasks = this.tasks.slice(0, this.tasks.length - 1);
    return last;
  }
}

function task(name: string, priority: number): Task {
  return { name, priority };
}

const queue = new TaskQueue();
heap.Init(queue);
heap.Push(queue, task('write', 3));
heap.Push(queue, task('test', 1));
heap.Push(queue, task('ship', 5));
heap.Push(queue, task('plan', 0));
assert(queue.Len() === 4, 'Push grows the queue');
const order: string[] = [];
while (queue.Len() > 0) order.push((heap.Pop(queue) as Task).name);
assert(order.join(',') === 'plan,test,write,ship', 'Pop yields by priority');

// sort.Interface, including through sort.Reverse; methods inherited from a base class
class Lengths {
  values: number[];
  constructor(values: number[]) {
    this.values = values;
  }
  Len(): number {
    return this.values.length;
  }
  Swap(i: number, j: number): void {
    const t = this.values[i];
    this.values[i] = this.values[j];
    this.values[j] = t;
  }
}

class Ascending extends Lengths implements sort.Interface {
  Less(i: number, j: number): boolean {
    return this.values[i] < this.values[j];
  }
}

const numbers = new Ascending([5, 3, 9, 1]);
assert(!sort.IsSorted(numbers), 'IsSorted before sorting');
sort.Sort(numbers);
assert(numbers.values.join(',') === '1,3,5,9' && sort.IsSorted(numbers), 'sort.Sort');
sort.Sort(sort.Reverse(numbers));
assert(numbers.values.join(',') === '9,5,3,1', 'sort.Reverse');
