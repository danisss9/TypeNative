// Enums

enum Status {
  Pending,
  Running,
  Done
}

const pending: Status = Status.Pending;
const running: Status = Status.Running;
const done: Status = Status.Done;

assert(pending === Status.Pending, 'numeric enum member access — pending');
assert(running === Status.Running, 'numeric enum member access — running');
assert(done === Status.Done, 'numeric enum member access — done');
assert((Status.Pending as Status) !== Status.Done, 'numeric enum values differ');

enum Direction {
  Up = 'UP',
  Down = 'DOWN'
}

const up: Direction = Direction.Up;
const down: Direction = Direction.Down;

assert(up === Direction.Up, 'string enum member access — up');
assert(down === Direction.Down, 'string enum member access — down');
assert((Direction.Up as Direction) !== Direction.Down, 'string enum values differ');
