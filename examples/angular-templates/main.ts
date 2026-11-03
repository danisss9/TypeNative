// Spike: minimal parseTemplate() smoke test over the vendored
// @angular/compiler bundle. Runs under `node main.ts` and, once compiled,
// as the TypeNative binary.
//
//   node main.ts
//   node ../../bin/cli.js --source examples/angular-templates/main.ts --script

import './dom-type-stubs.ts';
import { parseTemplate } from './vendor/angular/compiler/src/compiler.ts';

const template = `<section class="card">
  @if (user.name) {
    <h1>Hello {{ user.name | titlecase }}!</h1>
  } @else {
    <h1>Hello stranger</h1>
  }
  <ul>
    @for (item of items; track item.id) {
      <li [class.active]="item.id === selectedId" (click)="pick(item.id)">
        {{ item.label }}
      </li>
    } @empty {
      <li>No items yet</li>
    }
  </ul>
</section>
`;

const result = parseTemplate(template, 'spike.html', {
  preserveWhitespaces: true,
  preserveLineEndings: true,
});

console.log(`errors: ${result.errors === null ? 0 : result.errors.length}`);
for (const error of result.errors ?? []) console.log(`  ${error}`);
console.log(`nodes: ${result.nodes.length}`);
console.log(`styles: ${result.styles.length}`);
console.log(`styleUrls: ${result.styleUrls.length}`);
console.log(`ngContentSelectors: ${result.ngContentSelectors.length}`);
