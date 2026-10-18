const insideHost = (node: Node): boolean =>
  !!(node instanceof Element ? node : node.parentElement)?.closest(".roam-pele");

// Trailing debounce that still fires maxWaitMs after the first unprocessed trigger, so a constant stream of mutations cannot postpone it forever.
export const debounceMaxWait = (fn: () => void, delayMs: number, maxWaitMs: number) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let firstAt: number | undefined;
  const cancel = (): void => {
    clearTimeout(timer);
    timer = undefined;
    firstAt = undefined;
  };
  const trigger = (): void => {
    const now = Date.now();
    firstAt ??= now;
    clearTimeout(timer);
    timer = setTimeout(
      () => {
        cancel();
        fn();
      },
      Math.max(0, Math.min(delayMs, firstAt + maxWaitMs - now)),
    );
  };
  return { trigger, cancel };
};

export const observeBody = (onChange: () => void, delayMs = 100, maxWaitMs = 500): (() => void) => {
  const debounced = debounceMaxWait(onChange, delayMs, maxWaitMs);
  const observer = new MutationObserver((records) => {
    if (records.every((r) => insideHost(r.target))) return;
    debounced.trigger();
  });
  observer.observe(document.body, { childList: true, characterData: true, subtree: true });
  return () => {
    observer.disconnect();
    debounced.cancel();
  };
};
