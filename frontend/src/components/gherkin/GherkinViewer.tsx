'use client';

import { useState } from 'react';

interface Props { gherkin: string; }

// Coloreado sintáctico de Gherkin línea a línea
function colorize(line: string): React.ReactNode {
  const trimmed = line.trimStart();
  const indent  = line.length - trimmed.length;
  const pad     = '\u00a0'.repeat(indent);

  const kw = (cls: string, rest: string) => (
    <>
      {pad}
      <span className={cls}>{rest.split(':')[0]}:</span>
      <span className="text-zinc-200">{rest.includes(':') ? rest.slice(rest.indexOf(':') + 1) : ''}</span>
    </>
  );

  const step = (cls: string, keyword: string, rest: string) => {
    // Colorear strings entre comillas
    const parts = rest.split(/(".*?"|'.*?')/g);
    return (
      <>
        {pad}
        <span className={`font-semibold ${cls}`}>{keyword} </span>
        {parts.map((p, i) =>
          (p.startsWith('"') || p.startsWith("'"))
            ? <span key={i} className="text-amber-300">{p}</span>
            : <span key={i} className="text-zinc-200">{p}</span>
        )}
      </>
    );
  };

  if (/^Feature:/i.test(trimmed))  return kw('text-indigo-400 font-bold', trimmed);
  if (/^Scenario:/i.test(trimmed)) return kw('text-purple-400 font-semibold', trimmed);
  if (/^Background:/i.test(trimmed)) return kw('text-purple-400 font-semibold', trimmed);
  if (/^(Given|Dado que|Dado)\b/i.test(trimmed)) {
    const m = trimmed.match(/^(Given|Dado que|Dado)\s*/i)!;
    return step('text-cyan-400', m[0].trim(), trimmed.slice(m[0].length));
  }
  if (/^(When|Cuando)\b/i.test(trimmed)) {
    const m = trimmed.match(/^(When|Cuando)\s*/i)!;
    return step('text-orange-400', m[0].trim(), trimmed.slice(m[0].length));
  }
  if (/^(Then|Entonces)\b/i.test(trimmed)) {
    const m = trimmed.match(/^(Then|Entonces)\s*/i)!;
    return step('text-emerald-400', m[0].trim(), trimmed.slice(m[0].length));
  }
  if (/^(And|But|Y|Pero)\b/i.test(trimmed)) {
    const m = trimmed.match(/^(And|But|Y|Pero)\s*/i)!;
    return step('text-zinc-400', m[0].trim(), trimmed.slice(m[0].length));
  }
  if (trimmed.startsWith('#')) return <>{pad}<span className="text-zinc-600 italic">{trimmed}</span></>;
  if (trimmed.startsWith('@')) return <>{pad}<span className="text-pink-400">{trimmed}</span></>;

  return <>{pad}<span className="text-zinc-300">{trimmed}</span></>;
}

export function GherkinViewer({ gherkin }: Props) {
  const [copied, setCopied] = useState(false);
  const lines = gherkin.split('\n');

  const copy = async () => {
    await navigator.clipboard.writeText(gherkin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2">
        <span className="text-xs font-medium text-zinc-400">Gherkin</span>
        <button
          onClick={copy}
          className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          {copied ? '✅ Copiado' : '📋 Copiar'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-7 font-mono">
        {lines.map((line, i) => (
          <div key={i}>{colorize(line)}</div>
        ))}
      </pre>
    </div>
  );
}
