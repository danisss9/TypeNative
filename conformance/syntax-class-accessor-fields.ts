// `accessor` fields are plain fields: no getter / setter machinery, decorated
// accessors are not supported
class Settings {
  accessor theme = 'light';
  accessor size: number;
  constructor(size: number) {
    this.size = size;
  }
}
const s = new Settings(3);
assert(s.theme === 'light' && s.size === 3, 'accessor fields read');
s.theme = 'dark';
s.size = 4;
assert(s.theme === 'dark' && s.size === 4, 'accessor fields write');

class Extra extends Settings {
  accessor theme = 'blue';
  constructor() {
    super(1);
  }
}
const e = new Extra();
assert(e.theme === 'blue' && e.size === 1, 'a subclass accessor field shadows the parent field');
