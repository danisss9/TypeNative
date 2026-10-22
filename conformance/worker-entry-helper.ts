// The worker file lib-node-worker-entry.ts starts: compiled into its binary
// as a second entry point (run on its own, it does nothing)
import { parentPort, workerData, isMainThread, threadId } from 'node:worker_threads';

const factor = (workerData as { factor: number } | null)?.factor ?? 1;
const seen: number[] = [];

function scale(n: number): number {
  return n * factor;
}

parentPort?.on('message', (n: any) => {
  seen.push(n as number);
  parentPort?.postMessage({ result: scale(n as number), mainThread: isMainThread, threadId: threadId, count: seen.length });
});
