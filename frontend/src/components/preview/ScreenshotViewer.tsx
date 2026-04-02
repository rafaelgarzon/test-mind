interface Props { base64: string | null; alt?: string; }

export function ScreenshotViewer({ base64, alt = 'Screenshot del navegador' }: Props) {
  if (!base64) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 py-16 text-sm text-zinc-600">
        Sin captura disponible para este paso
      </div>
    );
  }

  const src = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full object-cover" />
    </div>
  );
}
