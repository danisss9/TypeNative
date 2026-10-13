import './side-effect-helper';
assert((globalThis as any).sideEffectRan === true, 'side-effect import');
