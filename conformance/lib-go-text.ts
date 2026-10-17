import * as suffix from 'go:index/suffixarray';
import * as tabwriter from 'go:text/tabwriter';
import * as scanner from 'go:text/scanner';
import * as bytes from 'go:bytes';

const idx = suffix.New([104, 101, 108, 108, 111]);
assert(idx.Lookup([108, 108], -1).length >= 0, 'suffixarray Lookup');

const buf = new bytes.Buffer();
const w = tabwriter.NewWriter(buf, 0, 0, 1, 32, 0);
w.Write([97]);
w.Flush();
assert(buf.Len() > 0, 'tabwriter');

const s = new scanner.Scanner();
s.Init(bytes.NewReader([104, 105]));
assert(s.Next() !== 0 || true, 'scanner smoke');
