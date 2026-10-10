const FENCE = /```[^\n]*\n([\s\S]*?)```/g;

/** Plain text with fenced code blocks rendered as <pre>. */
export function QuestionText({ text, className = 'question' }: { text: string; className?: string }) {
  const parts: { code: boolean; text: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(FENCE)) {
    if (m.index > last) parts.push({ code: false, text: text.slice(last, m.index) });
    parts.push({ code: true, text: m[1].replace(/\n$/, '') });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ code: false, text: text.slice(last) });

  return (
    <div className={className}>
      {parts.map((p, i) =>
        p.code ? (
          <pre key={i}><code>{p.text}</code></pre>
        ) : (
          <span key={i}>{p.text.replace(/^\n+|\n+$/g, '')}</span>
        ),
      )}
    </div>
  );
}
