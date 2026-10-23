import * as smtp from 'go:net/smtp';
import * as textproto from 'go:net/textproto';
import * as net from 'go:net';
import * as bytes from 'go:bytes';
import * as io from 'go:io';
import * as strings from 'go:strings';
import * as time from 'go:time';
import { chan } from 'go:builtin';

// A minimal SMTP server in TS: each session reports its command transcript
// and the message it received
const sessions = chan<string>(4);

function serve(c: textproto.Conn): void {
  const commands: string[] = [];
  let message = '';
  c.PrintfLine('220 probe.local ESMTP');
  let open = true;
  while (open) {
    const line = c.ReadLine();
    commands.push(line);
    const verb = strings.ToUpper(strings.Fields(line)[0]);
    if (verb === 'EHLO') {
      c.PrintfLine('250-probe.local');
      c.PrintfLine('250 AUTH PLAIN CRAM-MD5');
    } else if (verb === 'AUTH') {
      c.PrintfLine('235 2.7.0 Authentication successful');
    } else if (verb === 'DATA') {
      c.PrintfLine('354 End data with <CR><LF>.<CR><LF>');
      message = bytes.NewBuffer(c.ReadDotBytes()).String();
      c.PrintfLine('250 2.0.0 Queued');
    } else if (verb === 'QUIT') {
      c.PrintfLine('221 2.0.0 Bye');
      open = false;
    } else {
      c.PrintfLine('250 2.0.0 OK');
    }
  }
  c.Close();
  sessions.send(commands.join('\n'));
  sessions.send(message);
}

const listener = net.Listen('tcp', '127.0.0.1:0');
const addr = listener.Addr().String();
time.AfterFunc(0, () => {
  for (let i = 0; i < 2; i++) serve(textproto.NewConn(listener.Accept()));
});

// smtp.SendMail: EHLO, AUTH PLAIN (allowed unencrypted on localhost), MAIL, RCPT, DATA, QUIT
smtp.SendMail(
  addr,
  smtp.PlainAuth('', 'user', 'pass', '127.0.0.1'),
  'from@example.com',
  ['to@example.com', 'cc@example.com'],
  bytes.NewBufferString('Subject: probe\r\n\r\nhello from TypeNative\r\n').Bytes()
);
const sent = sessions.recv();
assert(strings.HasPrefix(sent, 'EHLO localhost\n'), 'SendMail greets');
assert(strings.Contains(sent, '\nAUTH PLAIN AHVzZXIAcGFzcw==\n'), 'PLAIN credentials');
assert(strings.Contains(sent, '\nMAIL FROM:<from@example.com>\n'), 'MAIL FROM');
assert(strings.Contains(sent, '\nRCPT TO:<to@example.com>\nRCPT TO:<cc@example.com>\n'), 'RCPT TO');
assert(strings.HasSuffix(sent, '\nDATA\nQUIT'), 'DATA then QUIT');
assert(sessions.recv() === 'Subject: probe\n\nhello from TypeNative\n', 'message body');

// smtp.Client step by step
const client = smtp.Dial(addr);
client.Hello('probe.client');
const [hasAuth, mechanisms] = client.Extension('AUTH');
assert(hasAuth && mechanisms === 'PLAIN CRAM-MD5', 'Extension');
client.Mail('a@example.com');
client.Rcpt('b@example.com');
const body = client.Data();
io.WriteString(body, 'Subject: second\r\n\r\n.leading dot\r\n');
body.Close();
client.Quit();
const stepwise = sessions.recv();
assert(strings.HasPrefix(stepwise, 'EHLO probe.client\nMAIL FROM:<a@example.com>'), 'Client commands');
assert(sessions.recv() === 'Subject: second\n\n.leading dot\n', 'dot-stuffing round-trips');

// Auth mechanisms on their own
let refused = '';
try {
  smtp
    .PlainAuth('', 'user', 'pass', 'mail.example.com')
    .Start(new smtp.ServerInfo({ Name: 'mail.example.com', TLS: false, Auth: ['PLAIN'] }));
} catch (e) {
  refused = (e as Error).message;
}
assert(refused === 'unencrypted connection', 'PlainAuth requires TLS off localhost');
const cram = smtp.CRAMMD5Auth('user', 'secret');
const [mechanism] = cram.Start(new smtp.ServerInfo({ Name: 'mail.example.com', TLS: true, Auth: ['CRAM-MD5'] }));
assert(mechanism === 'CRAM-MD5', 'CRAM-MD5 Start');
const answer = bytes.NewBuffer(cram.Next(bytes.NewBufferString('<1.2@probe>').Bytes(), true)).String();
assert(strings.HasPrefix(answer, 'user ') && answer.length === 5 + 32, 'CRAM-MD5 digest');
