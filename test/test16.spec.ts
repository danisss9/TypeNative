// Type alias and type assertion
type UserId = number;
type MaybeName = string | null;
type Label = UserId;

const id: UserId = 7;
const label: Label = id;
assert(label === 7, 'type alias — primitive alias and alias-of-alias');

const maybeName: MaybeName = null;
const finalName: string = maybeName ?? 'anonymous';
assert(finalName === 'anonymous', 'type alias — nullable alias works with nullish coalescing');

const sourceAny: any = 'hello';
const fromAs: string = sourceAny as string;
assert(fromAs === 'hello', 'type assertion — as syntax');

const sourceAny2: any = 12;
const fromAngle: number = <number>sourceAny2;
assert(fromAngle === 12, 'type assertion — angle bracket syntax');

const mixed: any = 'value';
const assertedAndTemplated: string = `x-${mixed as string}`;
assert(assertedAndTemplated === 'x-value', 'type assertion inside template expression');
