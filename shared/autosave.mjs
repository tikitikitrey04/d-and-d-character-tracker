// One write at a time; edits made during a request wait for the next save.
export function createAutosave({
  initial,
  save,
  onSaved,
  onStatus,
  delay = 1000,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  let current = initial,
    saved = initial,
    failed = null;
  let timer = null,
    request = null,
    disposed = false,
    paused = false;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  function clear() {
    if (timer !== null) cancel(timer);
    timer = null;
  }
  function plan() {
    clear();
    if (disposed || paused || request) return;
    if (same(current, saved)) {
      onStatus({ phase: "saved", error: "" });
    } else if (!same(current, failed)) {
      onStatus({ phase: "pending", error: "" });
      timer = schedule(() => {
        timer = null;
        void flush();
      }, delay);
    }
  }
  function flush() {
    clear();
    if (disposed || paused) return Promise.resolve();
    if (request) return request;
    if (same(current, saved)) return Promise.resolve();
    const snapshot = current;
    onStatus({ phase: "saving", error: "" });
    request = Promise.resolve()
      .then(() => save(snapshot))
      .then((result) => {
        saved = result;
        failed = null;
        if (same(current, snapshot)) current = result;
        if (!disposed) onSaved(result, snapshot);
      })
      .catch((error) => {
        failed = snapshot;
        if (!disposed)
          onStatus({
            phase: "error",
            error: error.message || "Could not save your character.",
          });
      })
      .finally(() => {
        request = null;
        plan();
      });
    return request;
  }
  return {
    update(value) {
      if (!same(value, current)) failed = null;
      current = value;
      plan();
    },
    flush,
    setPaused(value) {
      paused = value;
      plan();
    },
    dispose() {
      disposed = true;
      clear();
    },
  };
}
