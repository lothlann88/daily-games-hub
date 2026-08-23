/**
 * Serialises access to local storage.
 *
 * Every mutation here is read-modify-write: load the whole games array, change
 * one entry, write the array back. Two of those interleaving loses one of them
 * — logging a play while a sync is writing its merged library, for instance,
 * and the play vanishes. AsyncStorage gives no transactions, so the ordering
 * has to be imposed here.
 *
 * One global queue rather than one per key: `addScore` touches scores *and*
 * games together, and a per-key lock would let another writer slip between
 * those two halves.
 *
 * Tasks run strictly in the order they were queued. A task that throws does
 * not stall the queue, and its error still reaches its own caller.
 */

let tail: Promise<unknown> = Promise.resolve();

export function withStorageLock<T>(task: () => Promise<T>): Promise<T> {
  // Chain off the previous task whether it resolved or rejected, so one
  // failure can't wedge everything queued behind it.
  const run = tail.then(task, task);
  // The queue itself must never hold a rejected promise, or the next `.then`
  // would report an unhandled rejection that isn't ours to report.
  tail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

/** Test seam: resolves once everything queued so far has finished. */
export function storageLockIdle(): Promise<void> {
  return tail.then(
    () => undefined,
    () => undefined
  );
}
