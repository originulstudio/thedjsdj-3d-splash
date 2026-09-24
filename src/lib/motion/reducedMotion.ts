export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const listener = () => onChange(query.matches);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
