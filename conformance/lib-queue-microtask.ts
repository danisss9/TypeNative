const order: string[] = [];
queueMicrotask(() => order.push('micro'));
order.push('sync');
setTimeout(() => assert(order.join() === 'sync,micro', 'queueMicrotask'), 1);
