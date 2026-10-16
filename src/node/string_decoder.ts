// node:string_decoder — decodes Buffers to strings without splitting
// multibyte characters (UTF-8 / UTF-16LE) or base64 groups across writes

import { NodeRegistry, NodeCall, defineClass, defineHelper, defineModule } from './registry.js';

const stringDecoderHelper = `// node:string_decoder
type TnStringDecoder struct {
	encoding string
	pending  []byte
}

func TnNewStringDecoder(enc ...string) *TnStringDecoder {
	e := ""
	if len(enc) > 0 {
		e = enc[0]
	}
	return &TnStringDecoder{encoding: tnEncoding(e)}
}

func (d *TnStringDecoder) Get_encoding() string { return d.encoding }

// How many trailing bytes of b form an incomplete UTF-8 sequence
func tnIncompleteUTF8(b []byte) int {
	for i := 1; i <= 3 && i <= len(b); i++ {
		c := b[len(b)-i]
		if c&0xC0 == 0x80 {
			continue
		}
		need := 0
		switch {
		case c&0xE0 == 0xC0:
			need = 2
		case c&0xF0 == 0xE0:
			need = 3
		case c&0xF8 == 0xF0:
			need = 4
		}
		if need > i {
			return i
		}
		return 0
	}
	return 0
}

func (d *TnStringDecoder) write(chunk interface{}) string {
	var b []byte
	switch x := chunk.(type) {
	case []byte:
		b = x
	case string:
		return x
	}
	data := append(append([]byte{}, d.pending...), b...)
	d.pending = nil
	keep := 0
	switch d.encoding {
	case "utf8":
		keep = tnIncompleteUTF8(data)
	case "utf16le":
		keep = len(data) % 2
		if keep == 0 && len(data) >= 2 {
			// A high surrogate waits for its pair
			last := uint16(data[len(data)-2]) | uint16(data[len(data)-1])<<8
			if last >= 0xD800 && last <= 0xDBFF {
				keep = 2
			}
		}
	case "base64", "base64url":
		keep = len(data) % 3
	}
	if keep > 0 {
		d.pending = append([]byte{}, data[len(data)-keep:]...)
		data = data[:len(data)-keep]
	}
	return TnBufferToString(data, d.encoding)
}

func (d *TnStringDecoder) end(chunk ...interface{}) string {
	out := ""
	if len(chunk) > 0 && chunk[0] != nil {
		out = d.write(chunk[0])
	}
	if len(d.pending) > 0 {
		rest := d.pending
		d.pending = nil
		if d.encoding == "utf8" {
			out += "\\uFFFD"
		} else {
			out += TnBufferToString(rest, d.encoding)
		}
	}
	return out
}`;

export function registerStringDecoder(r: NodeRegistry): void {
  defineModule(r, 'string_decoder');
  defineHelper(r, 'stringDecoder', [], ['buffer'], stringDecoderHelper);
  defineClass(r, 'string_decoder.StringDecoder', '*TnStringDecoder', 'class', 'write=string; end=string', '', 'encoding=string', '');
  r.constructors['string_decoder.StringDecoder'] = (call: NodeCall) => {
    r.helper('stringDecoder');
    return `TnNewStringDecoder(${call.args.slice(0, 1).join(', ')})`;
  };
}
