export default function StreamingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1" aria-label="Copilot is thinking">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-accent-teal animate-streaming-dot"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}
