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

  isComplex(p: string): boolean {
    return p === this.name;
  }
}
