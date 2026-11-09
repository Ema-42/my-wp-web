"use client";

import { useEffect, useRef, useState } from "react";

// Muchos stickers animados de WhatsApp traen loop_count = 1 en el WebP (se
// reproducen una sola vez) y el navegador respeta eso al pie de la letra —
// no hay atributo ni CSS que le pida loopear. Truco: lo traemos UNA sola vez
// como blob (sin tráfico de red extra) y cada tantos segundos remontamos el
// <img> con un `key` nuevo apuntando al mismo blob URL, lo que fuerza al
// navegador a re-decodificar la animación desde el frame 0 — efecto de loop
// sin volver a pedir el archivo a la red en cada vuelta.
const RESTART_MS = 3500;

type Props = {
  src: string;
  alt: string;
  className?: string;
  title?: string;
  onClick?: () => void;
};

export function LoopingSticker({ src, alt, className, title, onClick }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBlobUrl(null);
    setRestartKey(0);

    fetch(src)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => {
        // Si falla, nos quedamos mostrando el <img src> directo de abajo.
      });

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src]);

  useEffect(() => {
    if (!blobUrl) return;
    const interval = setInterval(() => setRestartKey((k) => k + 1), RESTART_MS);
    return () => clearInterval(interval);
  }, [blobUrl]);

  if (!blobUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        title={title}
        onClick={onClick}
        loading="lazy"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={restartKey}
      src={blobUrl}
      alt={alt}
      className={className}
      title={title}
      onClick={onClick}
    />
  );
}
