function Badge(props: { label: string; count: number }): JSX.Element {
  return <span class="badge">{props.label}: {props.count}</span>;
}
function Card(props: { title: string; children?: JSX.Element }): JSX.Element {
  return (
    <div className="card">
      <h2>{props.title}</h2>
      {props.children}
    </div>
  );
}
const items = ['a', 'b'];
const page = (
  <Card title="Hi & bye">
    <ul>
      {items.map((i) => <li key={i}>{i}</li>)}
    </ul>
    <Badge label="n" count={2} />
    <br />
    <input disabled value="x" hidden={false} />
    <>tail</>
  </Card>
);
assert(
  page ===
    '<div class="card"><h2>Hi &amp; bye</h2><ul><li>a</li><li>b</li></ul><span class="badge">n: 2</span><br/><input disabled value="x"/>tail</div>',
  'jsx renders html'
);
