/**
 * Trailing-edge debounce, used by the friend search box so that typing a
 * username costs one lookup rather than one per keystroke.
 *
 * Deliberately a different shape from the `createDebouncer` click guards in
 * the auth screens: those fire on the *leading* edge and then block for a
 * while. This one waits until the calls stop and runs once, with the last
 * arguments it was given.
 *
 * Kept free of any React or PocketBase import so it stays unit-testable.
 */

export interface Debounced<A extends unknown[]> {
  (...args: A): void;
  /** Drop a pending call. A no-op when nothing is pending. */
  cancel(): void;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  delayMs: number
): Debounced<A> {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, delayMs);
  }) as Debounced<A>;

  debounced.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return debounced;
}
