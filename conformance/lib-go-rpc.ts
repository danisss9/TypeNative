import * as rpc from 'go:net/rpc';
import * as jsonrpc from 'go:net/rpc/jsonrpc';
import * as httptest from 'go:net/http/httptest';
import * as net from 'go:net';
import * as bufio from 'go:bufio';
import * as bytes from 'go:bytes';
import * as errors from 'go:errors';
import * as strings from 'go:strings';
import * as time from 'go:time';
import { ref, GoError, GoRef } from 'go:builtin';

// A TS class is an RPC service: its methods compile to the shape net/rpc
// registers, func (t *Arith) Multiply(args *Args, reply *float64) error
class Args {
  A = 0;
  B = 0;
}

function args(a: number, b: number): Args {
  const out = new Args();
  out.A = a;
  out.B = b;
  return out;
}

class Arith {
  calls = 0;
  Multiply(input: Args, reply: GoRef<number>): GoError | null {
    this.calls++;
    reply.value = input.A * input.B;
    return null;
  }
  Divide(input: Args, reply: GoRef<number>): GoError | null {
    this.calls++;
    if (input.B === 0) return errors.New('divide by zero');
    reply.value = input.A / input.B;
    return null;
  }
}

class NoMethods {
  count = 0;
}

function errorOf(fn: () => void): string {
  try {
    fn();
  } catch (e) {
    return (e as Error).message;
  }
  return '';
}

const arith = new Arith();
const server = rpc.NewServer();
server.Register(arith);
assert(
  strings.Contains(
    errorOf(() => {
      server.Register(new NoMethods());
    }),
    'has no exported methods of suitable type'
  ),
  'Register rejects a receiver without RPC methods'
);

// net/rpc: gob over HTTP (rpc.Server is an http.Handler)
const httpServer = httptest.NewServer(server);
const client = rpc.DialHTTPPath(
  'tcp',
  strings.TrimPrefix(httpServer.URL, 'http://'),
  rpc.DefaultRPCPath
);
const product = ref<number>(0);
client.Call('Arith.Multiply', args(6, 7), product);
assert(product.value === 42 && arith.calls === 1, 'Call runs the TS method');

const quotient = ref<number>(0);
const pending = client.Go('Arith.Divide', args(1, 4), quotient, null);
const finished = pending.Done.recv();
assert(finished.Error === null && quotient.value === 0.25, 'Go completes on the Done channel');
assert(
  errorOf(() => {
    client.Call('Arith.Divide', args(1, 0), quotient);
  }) === 'divide by zero',
  'a returned error reaches the caller'
);
assert(
  strings.Contains(
    errorOf(() => {
      client.Call('Arith.Missing', args(1, 1), quotient);
    }),
    "can't find method"
  ),
  'unknown methods are rejected'
);
client.Close();
assert(
  errorOf(() => {
    client.Call('Arith.Multiply', args(1, 1), product);
  }) === rpc.ErrShutdown.Error(),
  'ErrShutdown after Close'
);
httpServer.Close();

// net/rpc/jsonrpc: the JSON codec over loopback TCP, served from a timer goroutine
const jsonListener = net.Listen('tcp', '127.0.0.1:0');
time.AfterFunc(0, () => {
  server.ServeCodec(jsonrpc.NewServerCodec(jsonListener.Accept()));
});
const jsonClient = jsonrpc.Dial('tcp', jsonListener.Addr().String());
const sum = ref<number>(0);
jsonClient.Call('Arith.Multiply', args(3, 5), sum);
assert(sum.value === 15, 'jsonrpc Call');
assert(
  errorOf(() => {
    jsonClient.Call('Arith.Divide', args(1, 0), sum);
  }) === 'divide by zero',
  'jsonrpc error'
);
jsonClient.Close();
jsonListener.Close();

// The wire format, through the default server and jsonrpc.ServeConn
rpc.RegisterName('Calc', arith);
const rawListener = net.Listen('tcp', '127.0.0.1:0');
time.AfterFunc(0, () => {
  jsonrpc.ServeConn(rawListener.Accept());
});
const raw = net.Dial('tcp', rawListener.Addr().String());
raw.Write(
  bytes.NewBufferString('{"method":"Calc.Multiply","params":[{"A":2,"B":3}],"id":7}\n').Bytes()
);
const line = bufio.NewReader(raw).ReadString(10);
assert(strings.TrimSpace(line) === '{"id":7,"result":6,"error":null}', 'jsonrpc wire response');
raw.Close();
rawListener.Close();
