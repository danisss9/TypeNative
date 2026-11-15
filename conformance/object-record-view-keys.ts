// An any object viewed as Record<string, any> shares the object, and lists
// its keys only when something needs them: reads by key, key order (array
// indexes first), deletes, new keys, keys added through the object before
// the first listing, JSON and a view of something that isn't an object
function check(label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

function make(): any {
  return JSON.parse('{"b": 2, "a": 1, "10": "ten", "2": "two", "c": 3}');
}

// 1. Reads by key, and writes through the view reach the object
{
  const obj = make();
  const bag: Record<string, any> = obj;
  check('read a', bag['a'], 1);
  check('read missing', bag['zzz'], undefined);
  bag['a'] = 100;
  check('write through', obj.a, 100);
}

// 2. Key listings: array indexes first, ascending
{
  const bag: Record<string, any> = make();
  const keys = Object.keys(bag);
  check('key count', keys.length, 5);
  check('index first', keys[0], '2');
  check('index second', keys[1], '10');
  let seen = '';
  for (const k in bag) seen += k + ',';
  check('for in', seen.startsWith('2,10,'), true);
  check('entries', Object.entries(bag).length, 5);
  check('values', Object.values(bag).includes('ten'), true);
}

// 3. delete through the view, before and after the keys are listed
{
  const bag: Record<string, any> = make();
  delete bag['c'];
  check('deleted key gone', Object.keys(bag).includes('c'), false);
  check('after delete count', Object.keys(bag).length, 4);
  delete bag['2'];
  check('deleted index gone', Object.keys(bag)[0], '10');
  check('after second delete count', Object.keys(bag).length, 3);
}

// 4. A key set through the view goes after the existing ones
{
  const bag: Record<string, any> = make();
  bag['zz'] = 9;
  bag['aa'] = 8;
  const keys = Object.keys(bag);
  check('new key count', keys.length, 7);
  check('new key order', keys.indexOf('zz') < keys.indexOf('aa'), true);
  check('new key value', bag['aa'], 8);
}

// 5. A key added through the object before the view lists its keys
{
  const obj = make();
  const bag: Record<string, any> = obj;
  obj.later = 'yes';
  check('later key listed', Object.keys(bag).includes('later'), true);
  check('later key read', bag['later'], 'yes');
}

// 6. JSON of the view, and a view held in a loop (read by key only)
{
  const bag: Record<string, any> = make();
  const json = JSON.stringify(bag);
  check('json has keys', json.includes('"ten"') && json.includes('"b":2'), true);
  const rows: any[] = [];
  for (let i = 0; i < 50; i++) rows.push({ id: i, name: 'n' + i });
  let total = 0;
  for (const r of rows) {
    const v: Record<string, any> = r;
    total += v['id'] + v['name'].length;
  }
  check('loop total', total, 1225 + 10 * 2 + 40 * 3);
}

// 7. A view of something that isn't a plain object
{
  const none: any = undefined;
  const bag: Record<string, any> = none ?? {};
  check('empty view keys', Object.keys(bag).length, 0);
}

console.log('ok');
