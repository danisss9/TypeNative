// Field, accessor, getter, setter decorators, context.addInitializer, and Symbol.metadata

const events: string[] = [];

// 1. Field decorators (instance, static, private, no-initializer, stacked)
function doubleField<This>(_value: undefined, context: ClassFieldDecoratorContext<This, number>) {
  assert(context.kind === 'field', 'field context kind');
  return function (this: This, initial: number): number {
    return initial * 2;
  };
}

function addField(n: number) {
  return function <This>(_value: undefined, _context: ClassFieldDecoratorContext<This, number>) {
    return function (this: This, initial: number): number {
      return initial + n;
    };
  };
}

function defaultStr<This>(fallback: string) {
  return function (_value: undefined, context: ClassFieldDecoratorContext<This, string | undefined>) {
    context.addInitializer(function () {
      events.push(`field-init:${String(context.name)}`);
    });
    return function (this: This, initial: string | undefined): string {
      return initial ?? fallback;
    };
  };
}

// 2. Accessor decorators (auto-accessor)
function trackedAccessor<This, Value>(
  target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
): ClassAccessorDecoratorResult<This, Value> {
  assert(context.kind === 'accessor', 'accessor context kind');
  context.addInitializer(function () {
    events.push(`accessor-init:${String(context.name)}`);
  });
  return {
    get() {
      const v = target.get.call(this);
      events.push(`get:${String(context.name)}`);
      return v;
    },
    set(value: Value) {
      events.push(`set:${String(context.name)}`);
      target.set.call(this, value);
    },
    init(initialValue: Value): Value {
      events.push(`init:${String(context.name)}`);
      return initialValue;
    }
  };
}

// 3. Getter & Setter decorators
function wrapGetter<This>(_target: (this: This) => number, context: ClassGetterDecoratorContext<This, number>) {
  assert(context.kind === 'getter', 'getter context kind');
  return function (this: This): number {
    return _target.call(this) + 100;
  };
}

function clampSetter<This>(max: number) {
  return function (target: (this: This, v: number) => void, context: ClassSetterDecoratorContext<This, number>) {
    assert(context.kind === 'setter', 'setter context kind');
    return function (this: This, v: number): void {
      target.call(this, v > max ? max : v);
    };
  };
}

// 4. Method & Class addInitializer + Symbol.metadata
function meta(key: string, value: unknown) {
  return function (_target: any, context: DecoratorContext) {
    context.metadata[key] = value;
  };
}

function withClassInit(_target: any, context: ClassDecoratorContext) {
  context.addInitializer(function () {
    events.push(`class-init:${String(context.name)}`);
  });
}

function withMethodInit(_target: any, context: ClassMethodDecoratorContext) {
  context.addInitializer(function () {
    events.push(`method-init:${String(context.name)}`);
  });
}

@withClassInit
@meta('role', 'base')
class Widget {
  @addField(1)
  @doubleField
  score = 10;

  @doubleField
  static total = 5;

  @doubleField
  #secret = 7;

  @defaultStr('anon')
  label?: string;

  @trackedAccessor
  accessor count = 3;

  accessor plain = 42;
  static accessor staticCount = 9;

  private _val = 0;

  @wrapGetter
  get val(): number {
    return this._val;
  }

  @clampSetter(50)
  set val(v: number) {
    this._val = v;
  }

  @meta('method', 'ping')
  @withMethodInit
  ping(): number {
    return this.#secret;
  }
}

assert(events.includes('class-init:Widget'), 'class addInitializer ran');
assert(Widget.total === 10, 'static field decorator');
assert(Widget.staticCount === 9, 'static auto-accessor');
Widget.staticCount = 12;
assert(Widget.staticCount === 12, 'static auto-accessor write');

const w = new Widget();
assert(w.score === 21, 'stacked field decorators (10*2 + 1)');
assert(w.label === 'anon', 'field decorator without initializer');
assert(w.ping() === 14, 'private field decorator');
assert(w.plain === 42, 'undecorated auto-accessor');
w.plain = 99;
assert(w.plain === 99, 'undecorated auto-accessor write');

assert(w.count === 3, 'decorated auto-accessor read');
w.count = 8;
assert(w.count === 8, 'decorated auto-accessor write');
assert(events.includes('method-init:ping'), 'method addInitializer ran');
assert(events.includes('field-init:label'), 'field addInitializer ran');
assert(events.includes('accessor-init:count'), 'accessor addInitializer ran');
assert(events.includes('init:count') && events.includes('get:count') && events.includes('set:count'), 'accessor hooks ran');

w.val = 120;
assert(w.val === 150, 'setter clamped to 50, getter added 100');

// 5. Symbol.metadata & inheritance
assert(Widget[Symbol.metadata]?.['role'] === 'base', 'class metadata');
assert(Widget[Symbol.metadata]?.['method'] === 'ping', 'member metadata');

@meta('child', true)
class SubWidget extends Widget {}

assert(SubWidget[Symbol.metadata]?.['role'] === 'base', 'inherited metadata');
assert(SubWidget[Symbol.metadata]?.['child'] === true, 'own child metadata');
assert(Widget[Symbol.metadata]?.['child'] === undefined, 'parent metadata not mutated');

class Plain {}
assert(!Plain[Symbol.metadata], 'undecorated class has no metadata');

// 6. context.access
let capturedAccess: ClassFieldDecoratorContext<Box, number>['access'] | undefined;
function captureAccess(_v: undefined, ctx: ClassFieldDecoratorContext<Box, number>) {
  capturedAccess = ctx.access;
}
class Box {
  @captureAccess
  x = 11;
}
const box = new Box();
assert(capturedAccess !== undefined && capturedAccess.has(box), 'context.access.has');
assert(capturedAccess!.get(box) === 11, 'context.access.get');
capturedAccess!.set(box, 22);
assert(box.x === 22, 'context.access.set');
