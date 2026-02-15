// Interfaces and Classes
interface IBasic {
  isBasic(): boolean;
}

interface IComplex extends IBasic {
  isComplex(p: string): boolean;
}

class Basic implements IBasic {
  isBasic(): boolean {
    return true;
  }
}

class Complex extends Basic implements IComplex {
  name: string;

  constructor(name: string) {
    super();
    this.name = name;
  }

  override isBasic(): boolean {
    return false;
  }

  isComplex(p: string): boolean {
    return p === this.name;
  }
}

const simpleObj = new Basic();
console.log('Should print true:', simpleObj.isBasic());
const obj = new Complex('Test');
console.log('Should print false:', obj.isBasic());
console.log('Should print true:', obj.isComplex('Test'));
console.log('Should print false:', obj.isComplex('Not Test'));
