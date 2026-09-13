import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { debounce } from "@/lib/debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs once after the calls stop, with the last arguments", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 350);

    debounced("s");
    debounced("se");
    debounced("ser");
    vi.advanceTimersByTime(350);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("ser");
  });

  it("does not fire before the delay has elapsed", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 350);

    debounced("alice");
    vi.advanceTimersByTime(349);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("restarts the wait on every call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced("a");
    vi.advanceTimersByTime(80);
    debounced("ab");
    vi.advanceTimersByTime(80);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(20);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("ab");
  });

  it("cancel() suppresses a pending call", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 350);

    debounced("alice");
    debounced.cancel();
    vi.advanceTimersByTime(1000);

    expect(fn).not.toHaveBeenCalled();
  });

  it("schedules again after a completed cycle", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 350);

    debounced("alice");
    vi.advanceTimersByTime(350);
    debounced("bob");
    vi.advanceTimersByTime(350);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenLastCalledWith("bob");
  });

  it("cancel() on an idle debouncer is a no-op", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 350);

    expect(() => debounced.cancel()).not.toThrow();

    debounced("alice");
    vi.advanceTimersByTime(350);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
