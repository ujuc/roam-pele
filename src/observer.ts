const insideHost = (node: Node): boolean =>
  !!(node instanceof Element ? node : node.parentElement)?.closest(".roam-pele");

export const observeBody = (onChange: () => void, delayMs = 100): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const observer = new MutationObserver((records) => {
    if (records.every((r) => insideHost(r.target))) return;
    clearTimeout(timer);
    timer = setTimeout(onChange, delayMs);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    clearTimeout(timer);
  };
};
