// AmbientBackground — two slow-drifting blurred gradient blobs behind the
// app, in the spirit of 21st.dev's hero/background components. Kept subtle
// and pointer-events-none so it never interferes with reading or clicking;
// opacity comes from theme-aware CSS variables (lower in Daylight) since
// this is a working classroom tool, not a marketing page.
export default function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="animate-drift-one absolute -top-32 -left-32 h-[28rem] w-[28rem] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, var(--accent-ink), transparent 70%)',
          opacity: 'var(--ambient-opacity-1)',
        }}
      />
      <div
        className="animate-drift-two absolute -right-24 -bottom-40 h-[32rem] w-[32rem] rounded-full blur-3xl"
        style={{
          background: 'radial-gradient(circle, #818cf8, transparent 70%)',
          opacity: 'var(--ambient-opacity-2)',
        }}
      />
    </div>
  );
}
