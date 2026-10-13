declare const BUILD: string | undefined;
declare function external(): void;
class Lazy {
  value!: number;
  init(): void { this.value = 7; }
}
const l = new Lazy();
l.init();
assert(l.value === 7 && typeof BUILD === 'undefined', 'ambient declarations');
