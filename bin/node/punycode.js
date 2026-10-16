// node:punycode (deprecated upstream, still shipped): RFC 3492 encode / decode,
// toASCII / toUnicode for domains. Also backs url.domainToASCII and IDN hosts.
import { defineHelper, defineModule, setResults } from './registry.js';
const punycodeHelper = `// Punycode (RFC 3492)
const (
	tnPunyBase        = 36
	tnPunyTMin        = 1
	tnPunyTMax        = 26
	tnPunySkew        = 38
	tnPunyDamp        = 700
	tnPunyInitialBias = 72
	tnPunyInitialN    = 128
)

func tnPunyAdapt(delta int, numPoints int, first bool) int {
	if first {
		delta /= tnPunyDamp
	} else {
		delta /= 2
	}
	delta += delta / numPoints
	k := 0
	for delta > ((tnPunyBase-tnPunyTMin)*tnPunyTMax)/2 {
		delta /= tnPunyBase - tnPunyTMin
		k += tnPunyBase
	}
	return k + (tnPunyBase-tnPunyTMin+1)*delta/(delta+tnPunySkew)
}

func tnPunyDigit(d int) byte {
	if d < 26 {
		return byte('a' + d)
	}
	return byte('0' + d - 26)
}

func TnPunycodeEncode(input string) string {
	runes := []rune(input)
	out := []byte{}
	for _, r := range runes {
		if r < 0x80 {
			out = append(out, byte(r))
		}
	}
	basic := len(out)
	handled := basic
	if basic > 0 {
		out = append(out, '-')
	}
	n, delta, bias := tnPunyInitialN, 0, tnPunyInitialBias
	for handled < len(runes) {
		m := int(^uint(0) >> 1)
		for _, r := range runes {
			if int(r) >= n && int(r) < m {
				m = int(r)
			}
		}
		delta += (m - n) * (handled + 1)
		n = m
		for _, r := range runes {
			if int(r) < n {
				delta++
			}
			if int(r) == n {
				q := delta
				for k := tnPunyBase; ; k += tnPunyBase {
					t := k - bias
					if t < tnPunyTMin {
						t = tnPunyTMin
					} else if t > tnPunyTMax {
						t = tnPunyTMax
					}
					if q < t {
						break
					}
					out = append(out, tnPunyDigit(t+(q-t)%(tnPunyBase-t)))
					q = (q - t) / (tnPunyBase - t)
				}
				out = append(out, tnPunyDigit(q))
				bias = tnPunyAdapt(delta, handled+1, handled == basic)
				delta = 0
				handled++
			}
		}
		delta++
		n++
	}
	return string(out)
}

func TnPunycodeDecode(input string) string {
	out := []rune{}
	b := strings.LastIndex(input, "-")
	if b > 0 {
		for _, c := range input[:b] {
			out = append(out, c)
		}
		b++
	} else {
		b = 0
	}
	n, i, bias := tnPunyInitialN, 0, tnPunyInitialBias
	for pos := b; pos < len(input); {
		oldi, w := i, 1
		for k := tnPunyBase; ; k += tnPunyBase {
			if pos >= len(input) {
				panic(TnNodeError("RangeError", "", "Invalid input"))
			}
			c := input[pos]
			pos++
			digit := 0
			switch {
			case c >= '0' && c <= '9':
				digit = int(c-'0') + 26
			case c >= 'A' && c <= 'Z':
				digit = int(c - 'A')
			case c >= 'a' && c <= 'z':
				digit = int(c - 'a')
			default:
				panic(TnNodeError("RangeError", "", "Invalid input"))
			}
			i += digit * w
			t := k - bias
			if t < tnPunyTMin {
				t = tnPunyTMin
			} else if t > tnPunyTMax {
				t = tnPunyTMax
			}
			if digit < t {
				break
			}
			w *= tnPunyBase - t
		}
		bias = tnPunyAdapt(i-oldi, len(out)+1, oldi == 0)
		n += i / (len(out) + 1)
		i %= len(out) + 1
		out = append(out[:i], append([]rune{rune(n)}, out[i:]...)...)
		i++
	}
	return string(out)
}

func tnIsASCII(s string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] >= 0x80 {
			return false
		}
	}
	return true
}

func tnMapDomainLabels(domain string, fn func(string) string) string {
	// Node also splits on the ideographic full stops
	domain = strings.NewReplacer("\\u3002", ".", "\\uFF0E", ".", "\\uFF61", ".").Replace(domain)
	labels := strings.Split(domain, ".")
	for i, label := range labels {
		labels[i] = fn(label)
	}
	return strings.Join(labels, ".")
}

func TnPunycodeToASCII(domain string) string {
	return tnMapDomainLabels(domain, func(label string) string {
		if tnIsASCII(label) {
			return label
		}
		return "xn--" + TnPunycodeEncode(label)
	})
}

func TnPunycodeToUnicode(domain string) string {
	return tnMapDomainLabels(domain, func(label string) string {
		if strings.HasPrefix(strings.ToLower(label), "xn--") {
			return TnPunycodeDecode(strings.ToLower(label[4:]))
		}
		return label
	})
}`;
export function registerPunycode(r) {
    defineModule(r, 'punycode');
    defineHelper(r, 'punycode', ['strings'], ['error'], punycodeHelper);
    const fn = (name, goName) => {
        r.functions[`punycode.${name}`] = (call) => {
            r.helper('punycode');
            return `${goName}(${call.args[0]})`;
        };
    };
    fn('encode', 'TnPunycodeEncode');
    fn('decode', 'TnPunycodeDecode');
    fn('toASCII', 'TnPunycodeToASCII');
    fn('toUnicode', 'TnPunycodeToUnicode');
    setResults(r, 'punycode', 'encode=string; decode=string; toASCII=string; toUnicode=string');
    r.values['punycode.version'] = (_c) => '"2.1.0"';
    r.valueTypes['punycode.version'] = 'string';
}
