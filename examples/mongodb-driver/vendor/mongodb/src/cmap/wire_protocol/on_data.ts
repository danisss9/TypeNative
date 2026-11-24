import { type EventEmitter } from 'events';

import { type Abortable } from '../../mongo_types';
import { type TimeoutContext } from '../../timeout';
import { addAbortListener, kDispose, List, promiseWithResolvers } from '../../utils';

type PendingPromises = {
  resolve: (value: any) => void;
  reject: (err: any) => void;
};

export function onData(
  emitter: EventEmitter,
  { timeoutContext, signal, onClose }: { timeoutContext?: TimeoutContext; onClose?: (fn: () => void) => void } & Abortable
): AsyncGenerator<Uint8Array> {
  signal?.throwIfAborted();

  const unconsumedEvents = new List<Uint8Array>();
  const unconsumedPromises = new List<PendingPromises>();
  let error: Error | null = null;
  let finished = false;

  function eventHandler(value: Uint8Array) {
    const promise = unconsumedPromises.shift();
    if (promise != null) promise.resolve({ value, done: false });
    else unconsumedEvents.push(value);
  }

  function errorHandler(err: Error) {
    const promise = unconsumedPromises.shift();
    if (promise != null) promise.reject(err);
    else error = err;
    closeHandler();
  }

  function closeHandler() {
    if (finished) return;
    finished = true;
    emitter.off('data', eventHandler);
    emitter.off('error', errorHandler);
    abortListener?.[kDispose]();
    timeoutForSocketRead?.clear();
    const doneResult = { value: undefined as any, done: true };
    while (unconsumedPromises.length > 0) {
      const promise = unconsumedPromises.shift();
      promise?.resolve(doneResult);
    }
  }

  emitter.on('data', eventHandler);
  emitter.on('error', errorHandler);
  const abortListener = addAbortListener(signal, function () {
    errorHandler(this.reason);
  });

  const timeoutForSocketRead = timeoutContext?.timeoutForSocketRead;
  timeoutForSocketRead?.throwIfExpired();
  timeoutForSocketRead?.then(undefined, errorHandler);
  onClose?.(closeHandler);

  async function* pump(): AsyncGenerator<Uint8Array> {
    try {
      while (true) {
        const value = unconsumedEvents.shift();
        if (value != null) {
          yield value;
          continue;
        }
        if (error != null) {
          const err = error;
          error = null;
          throw err;
        }
        if (finished) return;
        const { promise, resolve, reject } = promiseWithResolvers<any>();
        unconsumedPromises.push({ resolve, reject });
        const next: any = await promise;
        if (next.done) return;
        yield next.value;
      }
    } finally {
      closeHandler();
    }
  }
  return pump();
}
