/** Serialize writes so a slow older autosave cannot overwrite a newer edit. */
export function createDesignSaver<T, R>(write: (document: T) => Promise<R>) {
  let tail: Promise<unknown> = Promise.resolve();
  return (document: T): Promise<R> => {
    const next = tail.then(() => write(document));
    tail = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  };
}
