import * as dwarf from 'go:debug/dwarf';
import * as elf from 'go:debug/elf';
import * as gosym from 'go:debug/gosym';
import * as macho from 'go:debug/macho';
import * as pe from 'go:debug/pe';
import * as plan9obj from 'go:debug/plan9obj';
import * as bytes from 'go:bytes';
import * as io from 'go:io';
import * as os from 'go:os';
import * as runtime from 'go:runtime';
import * as strings from 'go:strings';

// Byte builders for hand-made object files
function le(n: number, size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < size; i++) out.push(Math.floor(n / 2 ** (8 * i)) % 256);
  return out;
}

function be(n: number, size: number): number[] {
  return le(n, size).reverse();
}

function str(s: string, size: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < size; i++) out.push(i < s.length ? s.charCodeAt(i) : 0);
  return out;
}

const code = [0x90, 0x90, 0xc3];

// debug/elf: header, a .text section and the section-name table
const shstrtab = [0, ...str('.text', 6), ...str('.shstrtab', 10)];
// prettier-ignore
const elfImage = new Uint8Array([
  ...[0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ...le(2, 2), // ET_EXEC
  ...le(62, 2), // EM_X86_64
  ...le(1, 4),
  ...le(0x401000, 8), // entry
  ...le(0, 8), // no program headers
  ...le(88, 8), // section headers
  ...le(0, 4),
  ...le(64, 2),
  ...le(56, 2),
  ...le(0, 2),
  ...le(64, 2),
  ...le(3, 2),
  ...le(2, 2), // .shstrtab index
  ...code, // offset 64
  ...shstrtab, // offset 67
  ...[0, 0, 0, 0], // pad to 88
  ...le(0, 64), // null section
  ...le(1, 4), ...le(1, 4), ...le(6, 8), ...le(0x401000, 8), ...le(64, 8), ...le(3, 8), ...le(0, 8), ...le(16, 8), ...le(0, 8),
  ...le(7, 4), ...le(3, 4), ...le(0, 8), ...le(0, 8), ...le(67, 8), ...le(17, 8), ...le(0, 8), ...le(1, 8), ...le(0, 8)
]);
const ef = elf.NewFile(bytes.NewReader(elfImage));
assert(
  ef.Class === elf.ELFCLASS64 && ef.Machine === elf.EM_X86_64 && ef.Type === elf.ET_EXEC,
  'elf header'
);
assert(ef.Entry === 0x401000 && ef.Sections.length === 3, 'elf entry and sections');
const elfText = ef.Section('.text');
assert(elfText.Addr === 0x401000 && bytes.Equal(elfText.Data(), new Uint8Array(code)), 'elf .text');
assert(
  elf.EM_X86_64.String() === 'EM_X86_64' && elf.SHT_PROGBITS.String() === 'SHT_PROGBITS',
  'elf constant names'
);
let elfErr = '';
try {
  elf.NewFile(bytes.NewReader(new Uint8Array(str('not an object file', 64))));
} catch (e) {
  elfErr = (e as Error).message;
}
assert(strings.Contains(elfErr, 'bad magic number') === true, 'elf rejects garbage');

// debug/macho: 64-bit header, one __TEXT segment with a __text section
// prettier-ignore
const machoImage = new Uint8Array([
  ...le(0xfeedfacf, 4),
  ...le(0x01000007, 4), // CPU_TYPE_X86_64
  ...le(3, 4),
  ...le(2, 4), // MH_EXECUTE
  ...le(1, 4),
  ...le(152, 4),
  ...le(0, 4),
  ...le(0, 4),
  ...le(0x19, 4), // LC_SEGMENT_64
  ...le(152, 4),
  ...str('__TEXT', 16),
  ...le(0x100000000, 8), ...le(0x1000, 8), ...le(0, 8), ...le(187, 8),
  ...le(5, 4), ...le(5, 4), ...le(1, 4), ...le(0, 4),
  ...str('__text', 16),
  ...str('__TEXT', 16),
  ...le(0x1000000b8, 8), ...le(3, 8),
  ...le(184, 4), ...le(0, 4), ...le(0, 4), ...le(0, 4), ...le(0x80000400, 4), ...le(0, 4), ...le(0, 4), ...le(0, 4),
  ...code // offset 184
]);
const mf = macho.NewFile(bytes.NewReader(machoImage));
assert(
  mf.Magic === macho.Magic64 && mf.Cpu === macho.CpuAmd64 && mf.Type === macho.TypeExec,
  'macho header'
);
assert(mf.Segment('__TEXT') !== null && mf.Segment('__TEXT').Nsect === 1, 'macho segment');
assert(bytes.Equal(mf.Section('__text').Data(), new Uint8Array(code)), 'macho __text');
assert(macho.CpuArm64.String() === 'CpuArm64', 'macho constant names');
let fatErr: any = null;
try {
  macho.NewFatFile(bytes.NewReader(machoImage));
} catch (e) {
  fatErr = e;
}
assert(fatErr !== null, 'macho.NewFatFile rejects a thin file');

// debug/pe: DOS stub, COFF header, one .text section
// prettier-ignore
const peImage = new Uint8Array([
  ...str('MZ', 0x3c),
  ...le(0x40, 4),
  ...str('PE', 4),
  ...le(0x8664, 2), // IMAGE_FILE_MACHINE_AMD64
  ...le(1, 2),
  ...le(0, 4), ...le(0, 4), ...le(0, 4),
  ...le(0, 2),
  ...le(0x22, 2),
  ...str('.text', 8),
  ...le(3, 4), ...le(0x1000, 4), ...le(3, 4), ...le(0x80, 4), ...le(0, 4), ...le(0, 4), ...le(0, 2), ...le(0, 2),
  ...le(0x60000020, 4),
  ...code // offset 0x80
]);
const pf = pe.NewFile(bytes.NewReader(peImage));
assert(pf.Machine === pe.IMAGE_FILE_MACHINE_AMD64 && pf.NumberOfSections === 1, 'pe header');
const peText = pf.Section('.text');
assert(
  peText.VirtualAddress === 0x1000 && bytes.Equal(peText.Data(), new Uint8Array(code)),
  'pe .text'
);

// debug/plan9obj: 386 a.out with text, data and a one-symbol table
const plan9Syms = [...be(0x1020, 4), 0x80 | 'T'.charCodeAt(0), ...str('main', 5)];
// prettier-ignore
const plan9Image = new Uint8Array([
  ...be(plan9obj.Magic386, 4),
  ...be(3, 4), ...be(2, 4), ...be(0, 4), ...be(plan9Syms.length, 4), ...be(0x1020, 4), ...be(0, 4), ...be(0, 4),
  ...code,
  ...[0xca, 0xfe],
  ...plan9Syms
]);
const p9 = plan9obj.NewFile(bytes.NewReader(plan9Image));
assert(p9.Magic === plan9obj.Magic386 && p9.Entry === 0x1020, 'plan9obj header');
assert(
  bytes.Equal(p9.Section('text').Data(), new Uint8Array(code)) && p9.Section('data').Size === 2,
  'plan9obj sections'
);
const p9Syms = p9.Symbols();
assert(
  p9Syms.length === 1 &&
    p9Syms[0].Name === 'main' &&
    p9Syms[0].Type === 'T'.charCodeAt(0) &&
    p9Syms[0].Value === 0x1020,
  'plan9obj symbols'
);

// debug/dwarf: a one-DIE compile unit
const abbrev = [1, 0x11, 0, 0x03, 0x08, 0, 0, 0]; // DW_TAG_compile_unit, DW_AT_name: DW_FORM_string
const die = [1, ...str('probe.ts', 9)];
const info = [...le(7 + die.length, 4), ...le(4, 2), ...le(0, 4), 8, ...die];
const dd = dwarf.New(
  new Uint8Array(abbrev),
  null,
  null,
  new Uint8Array(info),
  null,
  null,
  null,
  null
);
const cu = dd.Reader().Next();
assert(cu.Tag === dwarf.TagCompileUnit && cu.Children === false, 'dwarf entry tag');
assert((cu.Val(dwarf.AttrName) as string) === 'probe.ts', 'dwarf attribute value');
assert(dwarf.TagCompileUnit.String() === 'CompileUnit', 'dwarf tag names');

// The running executable: its DWARF line table and pclntab point back at this .ts file
const exe = os.Executable();
let data: dwarf.Data | null = null;
let pclntab = new Uint8Array(0);
let textStart = 0;
if (runtime.GOOS === 'windows') {
  const own = pe.Open(exe);
  data = own.DWARF();
  let start = -1;
  let end = -1;
  let section = 0;
  for (const sym of own.Symbols) {
    if (sym.Name === 'runtime.pclntab') {
      start = sym.Value;
      section = sym.SectionNumber;
    }
    if (sym.Name === 'runtime.epclntab') end = sym.Value;
  }
  assert(start >= 0 && end > start, 'pe pclntab symbols');
  pclntab = own.Sections[section - 1].Data().slice(start, end);
  textStart = own.Section('.text').VirtualAddress;
  own.Close();
} else if (runtime.GOOS === 'darwin') {
  const own = macho.Open(exe);
  data = own.DWARF();
  pclntab = own.Section('__gopclntab').Data();
  textStart = own.Section('__text').Addr;
  own.Close();
} else {
  const own = elf.Open(exe);
  data = own.DWARF();
  pclntab = own.Section('.gopclntab').Data();
  textStart = own.Section('.text').Addr;
  own.Close();
}

const reader = data!.Reader();
let mainUnit: dwarf.Entry | null = null;
for (let entry = reader.Next(); entry !== null; entry = reader.Next()) {
  if (entry.Tag === dwarf.TagCompileUnit) {
    if ((entry.Val(dwarf.AttrName) as string) === 'main') mainUnit = entry;
    reader.SkipChildren();
  }
}
assert(mainUnit !== null, 'dwarf finds the main compile unit');
const lines = data!.LineReader(mainUnit);
const lineEntry = new dwarf.LineEntry();
let fromProbe = false;
let atEnd = false;
for (;;) {
  try {
    lines.Next(lineEntry);
  } catch (e) {
    assert((e as Error).message === io.EOF.Error(), 'dwarf line reader ends with EOF');
    atEnd = true;
  }
  if (atEnd) break;
  if (strings.HasSuffix(lineEntry.File.Name, 'lib-go-debug.ts')) fromProbe = true;
}
assert(fromProbe, 'dwarf line table maps to the .ts source');

// debug/gosym: symbol-name helpers and the pclntab lookup
const sym = new gosym.Sym({ Name: 'main.(*Server).Close' });
assert(
  sym.PackageName() === 'main' && sym.ReceiverName() === '(*Server)' && sym.BaseName() === 'Close',
  'gosym.Sym names'
);
const table = gosym.NewTable(null, gosym.NewLineTable(pclntab, textStart));
const mainFn = table.LookupFunc('main.main');
assert(mainFn !== null && mainFn.Entry < mainFn.End, 'gosym LookupFunc');
assert(table.PCToFunc(mainFn.Entry).Name === 'main.main', 'gosym PCToFunc');
let probeLine = 0;
for (let pc = mainFn.Entry; pc < mainFn.End && probeLine === 0; pc += 4) {
  const [file, line, fn] = table.PCToLine(pc);
  if (strings.HasSuffix(file, 'lib-go-debug.ts') && fn.Name === 'main.main') probeLine = line;
}
assert(probeLine > 0, 'gosym PCToLine maps main.main to the .ts source');
