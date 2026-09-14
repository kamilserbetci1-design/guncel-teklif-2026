'use client';

import { useRef, useEffect } from 'react';

// İçeriğe göre yüksekliği kendiliğinden büyüyen metin kutusu (tek satır başlar, alt satır ekleyince uzar)
export default function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = () => {
    const t = ref.current;
    if (!t) return;
    t.style.height = 'auto';
    t.style.height = `${t.scrollHeight}px`;
  };

  useEffect(() => { resize(); }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onInput={resize}
      rows={1}
      placeholder={placeholder}
      className={className}
      style={{ resize: 'none', overflow: 'hidden' }}
    />
  );
}
