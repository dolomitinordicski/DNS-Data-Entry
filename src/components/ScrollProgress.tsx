export function ScrollProgress() {
  return (
    <div
      id="dns-scroll-progress"
      className="dns-scroll-progress-track"
      role="progressbar"
      aria-label="Page scroll progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <span id="dns-scroll-progress-bar" className="dns-scroll-progress-bar" />
    </div>
  );
}
