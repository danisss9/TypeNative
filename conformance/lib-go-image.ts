import * as image from 'go:image';
import * as png from 'go:image/png';
import * as bytes from 'go:bytes';

const rect = image.Rect(0, 0, 4, 4);
const img = image.NewRGBA(rect);
assert(img.Bounds().Dx() === 4, 'NewRGBA bounds');

const buf = new bytes.Buffer();
png.Encode(buf, img);
assert(buf.Len() > 0, 'png encode');

const decoded = png.Decode(bytes.NewReader(buf.Bytes()));
assert(decoded.Bounds().Dx() === 4, 'png decode round-trip');
