import * as image from 'go:image';
import * as color from 'go:image/color';
import * as palette from 'go:image/color/palette';
import * as draw from 'go:image/draw';
import * as gif from 'go:image/gif';
import * as jpeg from 'go:image/jpeg';
import * as bytes from 'go:bytes';

// image/color: struct colors, models and conversions.
const red = new color.RGBA({ R: 255, G: 0, B: 0, A: 255 });
const [r, g, b, a] = red.RGBA();
assert(r === 0xffff && g === 0 && b === 0 && a === 0xffff, 'color.RGBA.RGBA');
const gray = color.GrayModel.Convert(red);
const [gr] = gray.RGBA();
assert(gr > 0 && gr < 0xffff, 'color.GrayModel.Convert');
const [y, cb, cr] = color.RGBToYCbCr(255, 0, 0);
assert(y === 76 && cb === 85 && cr === 255, `color.RGBToYCbCr: ${y},${cb},${cr}`);

// image/color/palette.
assert(palette.WebSafe.length === 216 && palette.Plan9.length === 256, 'palette sizes');

// image/draw: fill a rectangle with a uniform color.
const img = image.NewRGBA(image.Rect(0, 0, 8, 8));
draw.Draw(img, img.Bounds(), image.NewUniform(red), image.Pt(0, 0), draw.Src);
const px = img.RGBAAt(3, 3);
assert(px.R === 255 && px.A === 255, 'draw.Draw fill');

// image/gif: paletted encode → decode.
const gbuf = new bytes.Buffer();
gif.Encode(gbuf, img, null);
const gdecoded = gif.Decode(bytes.NewReader(gbuf.Bytes()));
assert(gdecoded.Bounds().Dx() === 8, 'gif round-trip');

// image/jpeg: lossy encode → decode keeps the size.
const jbuf = new bytes.Buffer();
jpeg.Encode(jbuf, img, new jpeg.Options({ Quality: 90 }));
const jcfg = jpeg.DecodeConfig(bytes.NewReader(jbuf.Bytes()));
assert(jcfg.Width === 8 && jcfg.Height === 8, 'jpeg DecodeConfig');

let threw = '';
try {
  jpeg.Decode(bytes.NewReader([1, 2, 3]));
} catch (e) {
  threw = (e as Error).message;
}
assert(threw !== '', 'jpeg decode error throws');
