// Symbol trait markers for semantics-symbol-traits
export const ConsumesVarsTrait: unique symbol = Symbol('ConsumesVars');
export interface ConsumesVarsTrait { [ConsumesVarsTrait]: true; }
export const TRAIT_CONSUMES_VARS: ConsumesVarsTrait = { [ConsumesVarsTrait]: true } as const;
export function hasConsumesVarsTrait(value: any): boolean {
  return (value as Partial<ConsumesVarsTrait>)[ConsumesVarsTrait] === true;
}
