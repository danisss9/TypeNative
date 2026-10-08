interface Shape { area(): number; }
class R implements Shape { area(): number { return 6; } }
const s: Shape = new R();
assert(s.area() === 6, 'implements');
