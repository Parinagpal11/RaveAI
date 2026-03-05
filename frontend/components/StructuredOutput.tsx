'use client';

type Props = {
  text: string;
};

export function StructuredOutput({ text }: Props) {
  const lines = text.split('\n').map((l) => l.trimEnd());
  const nodes: JSX.Element[] = [];
  let bullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (!bullets.length) return;
    nodes.push(
      <ul key={`b-${key++}`} style={{ marginTop: 0, paddingLeft: 18 }}>
        {bullets.map((b, i) => (
          <li key={`bi-${i}`}>{b}</li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }

    if (line.startsWith('### ')) {
      flushBullets();
      nodes.push(<h4 key={`h-${key++}`} style={{ marginBottom: 8 }}>{line.slice(4)}</h4>);
      continue;
    }

    if (line.startsWith('- ')) {
      bullets.push(line.slice(2));
      continue;
    }

    flushBullets();
    nodes.push(<p key={`p-${key++}`} style={{ marginTop: 0 }}>{line}</p>);
  }

  flushBullets();

  return <div>{nodes}</div>;
}
