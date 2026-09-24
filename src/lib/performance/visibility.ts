export function onVisibility(handler: (hidden: boolean) => void): () => void {
  const listener = () => handler(document.hidden);
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}
