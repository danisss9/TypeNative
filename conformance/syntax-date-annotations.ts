// Date in type annotations: variables, parameters, return types, class and
// interface fields, arrays, maps, and `as Date` from a dynamic value

interface Meeting {
  title: string;
  at: Date;
}

class Appointment {
  constructor(public at: Date) {}
  later(ms: number): Date {
    return new Date(this.at.getTime() + ms);
  }
}

function earliest(dates: Date[]): Date {
  let min: Date = dates[0];
  for (const d of dates) {
    if (d.getTime() < min.getTime()) min = d;
  }
  return min;
}

const start: Date = new Date(1000);
const meeting: Meeting = { title: 'sync', at: new Date(5000) };
const ev = new Appointment(start);
assert(ev.later(500).getTime() === 1500, 'Date return types and class fields');
assert(earliest([meeting.at, start, new Date(3000)]).getTime() === 1000, 'Date[] parameters');

const byName = new Map<string, Date>();
byName.set('a', new Date(42));
const got: Date | undefined = byName.get('a');
assert(got !== undefined && got.getTime() === 42, 'Map<string, Date>');

const raw: any = { when: new Date(7) };
assert((raw.when as Date).getTime() === 7, '`as Date` on a dynamic value');
const cast = raw.when as Date;
assert(cast.toISOString() === '1970-01-01T00:00:00.007Z', 'a cast Date keeps its methods');
console.log('date annotations ok');
