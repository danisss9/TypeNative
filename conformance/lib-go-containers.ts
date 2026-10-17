import * as list from 'go:container/list';
import * as ring from 'go:container/ring';

const l = list.New();
l.PushBack(1);
l.PushBack(2);
assert(l.Len() === 2, 'list Len');
assert(l.Front().Value === 1, 'Front().Value');

const r = ring.New(3);
assert(r.Len() === 3, 'ring Len');
