import * as testing from 'go:testing';
import * as cryptotest from 'go:testing/cryptotest';
import * as slogtest from 'go:testing/slogtest';
import * as synctest from 'go:testing/synctest';
import * as rand from 'go:crypto/rand';
import * as json from 'go:encoding/json';
import * as slog from 'go:log/slog';
import * as bytes from 'go:bytes';
import * as time from 'go:time';
import { ref } from 'go:builtin';

// Each JSON log line as a map, for slogtest
function parseLines(buf: bytes.Buffer): Record<string, any>[] {
  const out: Record<string, any>[] = [];
  for (const line of bytes.Split(buf.Bytes(), new Uint8Array([10]))) {
    if (line.length === 0) continue;
    const m = ref<Record<string, any>>();
    json.Unmarshal(line, m);
    out.push(m.value);
  }
  return out;
}

// A *testing.T outside `go test`: testing.Main runs the tests like a test
// binary would, then exits with status 1 if any of them failed
testing.Main(
  (_pattern: string, _name: string) => true,
  [
    // testing/cryptotest: reaches SetGlobalRandom with a real *testing.T, which
    // refuses to seed crypto/rand outside a `go test` binary (testing.Testing())
    new testing.InternalTest({
      Name: 'TestGlobalRandom',
      F: (t: testing.T) => {
        let refused = '';
        try {
          cryptotest.SetGlobalRandom(t, 42);
        } catch (e) {
          refused = String(e);
        }
        if (refused !== 'cryptotest: SetGlobalRandom used in a non-test binary')
          t.Errorf('SetGlobalRandom: %q', refused);
        const random = new Uint8Array(16);
        rand.Read(random);
        if (bytes.Equal(random, new Uint8Array(16)))
          t.Error('crypto/rand still reads the system source');
      }
    }),
    // testing/slogtest: the JSON handler passes the handler conformance suite
    new testing.InternalTest({
      Name: 'TestSlogHandler',
      F: (t: testing.T) => {
        const buf = new bytes.Buffer();
        slogtest.TestHandler(slog.NewJSONHandler(buf, null), () => parseLines(buf));
        let perTest = new bytes.Buffer();
        slogtest.Run(
          t,
          (_t: testing.T) => {
            perTest = new bytes.Buffer();
            return slog.NewJSONHandler(perTest, null);
          },
          (_t: testing.T) => {
            const lines = parseLines(perTest);
            return lines.length > 0 ? lines[0] : {};
          }
        );
      }
    }),
    // testing/synctest: fake time inside a bubble
    new testing.InternalTest({
      Name: 'TestBubble',
      F: (t: testing.T) => {
        synctest.Test(t, (bt: testing.T) => {
          const start = time.Now();
          let fired = false;
          time.AfterFunc(time.Minute, () => {
            fired = true;
          });
          time.Sleep(time.Hour);
          synctest.Wait();
          if (time.Since(start) !== time.Hour) bt.Errorf('slept %v', time.Since(start));
          if (!fired) bt.Error('AfterFunc did not fire');
        });
      }
    })
  ],
  [],
  []
);
