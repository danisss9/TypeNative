// Angular template compiler, natively: the vendored @angular/compiler parses
// an Angular template (control flow, bindings, pipes, i18n, @defer, …) and
// compiles it to the Ivy instructions of a component definition, printed as
// JavaScript. The output is the same as running this file under Node.
//
//   node --experimental-transform-types main.ts [template.html]
//   typenative --source main.ts --output ng-compile && ./ng-compile [template.html]

import './dom-type-stubs.ts';
import * as fs from 'node:fs';
import {
  ChangeDetectionStrategy,
  compileComponentFromMetadata,
  ConstantPool,
  DeclarationListEmitMode,
  DeferBlockDepsEmitMode,
  EmitterVisitorContext,
  makeBindingParser,
  outputAst as o,
  parseTemplate,
  ParseLocation,
  ParseSourceFile,
  ParseSourceSpan,
  ViewEncapsulation,
  type R3ComponentMetadata,
  type R3TemplateDependency,
} from './vendor/angular/compiler/src/compiler.ts';
import { AbstractJsEmitterVisitor } from './vendor/angular/compiler/src/output/abstract_js_emitter.ts';

const DEMO_TEMPLATE = `<section class="card" [class.compact]="compact">
  @if (user.name) {
    <h1 title="Greeting">Hello {{ user.name | titlecase }}!</h1>
  } @else {
    <h1>Hello stranger</h1>
  }
  <ul>
    @for (item of items; track item.id; let i = $index, last = $last) {
      <li [class.active]="item.id === selectedId" (click)="pick(item.id, $event)">
        {{ i + 1 }}. {{ item.label }}@if (!last) {,}
      </li>
    } @empty {
      <li>No items yet</li>
    }
  </ul>
  @switch (mode) {
    @case ('edit') { <input [value]="draft" (input)="draft = $any($event.target).value" /> }
    @default { <p>{{ draft || 'Nothing to edit' }}</p> }
  }
  <ng-template #tpl let-label="label"><b>{{ label }}</b></ng-template>
  <button type="button" [disabled]="!items.length" (click)="save()">Save {{ items.length }}</button>
  @let total = items.length * 2;
  <footer [attr.data-total]="total" [style.color]="color">{{ total }} points</footer>
  <ng-content select="[slot=footer]" />
</section>
`;

// Prints external references (Ivy instructions) as `i0.ɵɵname`, as the
// Angular CLI's output does
class SourceEmitter extends AbstractJsEmitterVisitor {
  override visitExternalExpr(ast: o.ExternalExpr, ctx: EmitterVisitorContext): any {
    const name = ast.value.name ?? 'unknown';
    ctx.print(ast, ast.value.moduleName === '@angular/core' ? `i0.${name}` : name);
    return null;
  }
}

function emit(statement: o.Statement): string {
  const ctx = EmitterVisitorContext.createRoot();
  statement.visitStatement(new SourceEmitter(), ctx);
  return ctx.toSource();
}

function compile(template: string, url: string): string {
  const parsed = parseTemplate(template, url, { preserveWhitespaces: false });
  const out: string[] = [];
  if (parsed.errors !== null && parsed.errors.length > 0) {
    for (const error of parsed.errors) out.push(`// error: ${error}`);
    return out.join('\n');
  }

  const file = new ParseSourceFile('', 'demo.component.ts');
  const start = new ParseLocation(file, 0, 0, 0);
  const meta: R3ComponentMetadata<R3TemplateDependency> = {
    name: 'DemoComponent',
    type: { value: new o.ReadVarExpr('DemoComponent'), type: new o.ReadVarExpr('DemoComponent') },
    typeArgumentCount: 0,
    typeSourceSpan: new ParseSourceSpan(start, start),
    deps: [],
    selector: 'app-demo',
    queries: [],
    viewQueries: [],
    host: { attributes: {}, listeners: {}, properties: {}, specialAttributes: {} },
    lifecycle: { usesOnChanges: false },
    inputs: {},
    outputs: {},
    usesInheritance: false,
    controlCreate: null,
    exportAs: null,
    providers: null,
    isStandalone: true,
    isSignal: false,
    hostDirectives: null,
    legacyOptionalChaining: false,
    i18nUseExternalIds: true,
    template: { nodes: parsed.nodes, ngContentSelectors: parsed.ngContentSelectors, preserveWhitespaces: false },
    declarations: [],
    defer: { mode: DeferBlockDepsEmitMode.PerComponent, dependenciesFn: null },
    declarationListEmitMode: DeclarationListEmitMode.Direct,
    styles: [],
    encapsulation: ViewEncapsulation.Emulated,
    animations: null,
    viewProviders: null,
    relativeContextFilePath: 'demo.component.ts',
    changeDetection: ChangeDetectionStrategy.OnPush,
    relativeTemplatePath: null,
    hasDirectiveDependencies: false,
    foreignImports: null,
  };

  const pool = new ConstantPool();
  const compiled = compileComponentFromMetadata(meta, pool, makeBindingParser());
  for (const statement of pool.statements) out.push(emit(statement));
  out.push(emit(new o.DeclareVarStmt('ɵcmp', compiled.expression, undefined, o.StmtModifier.Final)));
  return out.join('\n');
}

const path = process.argv[2];
const template = path ? fs.readFileSync(path, 'utf-8') : DEMO_TEMPLATE;
console.log(compile(template, path ?? 'demo.component.html'));
