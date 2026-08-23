import { describe, expect, it } from "vitest";

import { storageLockIdle, withStorageLock } from "@/lib/storage-lock";

const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

describe("withStorageLock", () => {
  it("runs tasks one at a time, in the order they were queued", async () => {
    const events: string[] = [];
    const task = (name: string, delay: number) => () =>
      (async () => {
        events.push(`${name}:start`);
        await tick(delay);
        events.push(`${name}:end`);
      })();

    // The first task is the slowest — without the lock it would finish last
    // and its "end" would be interleaved with the others' "start".
    await Promise.all([
      withStorageLock(task("a", 30)),
      withStorageLock(task("b", 10)),
      withStorageLock(task("c", 0)),
    ]);

    expect(events).toEqual([
      "a:start", "a:end",
      "b:start", "b:end",
      "c:start", "c:end",
    ]);
  });

  it("returns each task's own value to its own caller", async () => {
    const results = await Promise.all([
      withStorageLock(async () => 1),
      withStorageLock(async () => 2),
      withStorageLock(async () => 3),
    ]);
    expect(results).toEqual([1, 2, 3]);
  });

  it("surfaces a task's error to its caller", async () => {
    await expect(
      withStorageLock(async () => {
        throw new Error("write failed");
      })
    ).rejects.toThrow("write failed");
  });

  it("keeps running queued tasks after one throws", async () => {
    const done: string[] = [];
    const failing = withStorageLock(async () => {
      throw new Error("boom");
    });
    const following = withStorageLock(async () => {
      done.push("ran");
      return "ok";
    });

    await expect(failing).rejects.toThrow("boom");
    await expect(following).resolves.toBe("ok");
    expect(done).toEqual(["ran"]);
  });

  it("does not interleave a read-modify-write pair", async () => {
    // Stand-in for the real hazard: both tasks read the same value, add to it,
    // and write it back with an await in the middle.
    let stored = 0;
    const increment = () => async () => {
      const current = stored;
      await tick(5);
      stored = current + 1;
    };

    await Promise.all(Array.from({ length: 10 }, () => withStorageLock(increment())));

    expect(stored).toBe(10);
  });

  it("loses writes without the lock — the behaviour being fixed", async () => {
    let stored = 0;
    const increment = async () => {
      const current = stored;
      await tick(5);
      stored = current + 1;
    };

    await Promise.all(Array.from({ length: 10 }, () => increment()));

    // Every unlocked task read 0 before any of them wrote, so nine are lost.
    expect(stored).toBe(1);
  });

  it("reports idle once the queue drains", async () => {
    let finished = false;
    void withStorageLock(async () => {
      await tick(10);
      finished = true;
    });
    await storageLockIdle();
    expect(finished).toBe(true);
  });
});
