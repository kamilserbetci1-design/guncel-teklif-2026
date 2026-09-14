'use client';

import { useRef, useEffect, useState } from 'react';
import { StickyNote } from 'lucide-react';

// Basit zengin metin editörü (contentEditable). Kalın/italik/altı çizili,
// yazı boyutu, renk, madde/numaralı liste, alt satır. Değer HTML olarak tutulur.
const COLORS = ['#111827', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb', '#7c3aed', '#ffffff'];
const SIZES: Array<{ l: string; v: string }> = [
  { l: 'S', v: '2' },
  { l: 'M', v: '3' },
  { l: 'L', v: '5' },
];

export default function RichEditor({
  value,
  onChange,
  placeholder,
  minHeight = 40,
  lists = true,
  toolbarOnFocus = false,
  onSnippetClick,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  lists?: boolean;
  toolbarOnFocus?: boolean;
  onSnippetClick?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [colorOpen, setColorOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const showToolbar = !toolbarOnFocus || focused;

  // İçeriği yalnızca dışarıdan farklıysa güncelle (imleç zıplamasın).
  // Düz metin (etiket yok) ise satır sonlarını <br>'e çevir ki tek satıra binmesin.
  useEffect(() => {
    if (!ref.current) return;
    const v = value || '';
    const html = /<[a-z][\s\S]*>/i.test(v) ? v : v.replace(/\n/g, '<br>');
    if (ref.current.innerHTML !== html) ref.current.innerHTML = html;
  }, [value]);

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML || '');
  };

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white focus-within:border-blue-500">
      {showToolbar && (
      <div className="flex items-center gap-0.5 flex-wrap px-1.5 py-1 bg-gray-50 border-b border-gray-200">
        <TB onClick={() => exec('bold')} title="Kalın"><b>B</b></TB>
        <TB onClick={() => exec('italic')} title="İtalik"><i>I</i></TB>
        <TB onClick={() => exec('underline')} title="Altı çizili"><u>U</u></TB>
        <span className="w-px h-4 bg-gray-300 mx-0.5" />
        {SIZES.map((s) => (
          <TB key={s.v} onClick={() => exec('fontSize', s.v)} title={`Yazı boyutu ${s.l}`}><span className="font-bold">{s.l}</span></TB>
        ))}
        <span className="w-px h-4 bg-gray-300 mx-0.5" />
        <div className="relative">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setColorOpen((o) => !o)}
            title="Yazı rengi"
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
          >
            <span
              className="w-4 h-4 rounded-full border border-gray-300 shadow-inner"
              style={{ background: 'conic-gradient(from 90deg, #dc2626, #ea580c, #ca8a04, #16a34a, #2563eb, #7c3aed, #dc2626)' }}
            />
          </button>
          {colorOpen && (
            <>
              <div className="fixed inset-0 z-20" onMouseDown={(e) => e.preventDefault()} onClick={() => setColorOpen(false)} />
              <div className="absolute z-30 top-8 left-0 bg-white border border-gray-200 rounded-xl shadow-xl p-2.5 grid grid-cols-4 gap-2 w-max">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { exec('foreColor', c); setColorOpen(false); }}
                    className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform shrink-0"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        {lists && (
          <>
            <span className="w-px h-4 bg-gray-300 mx-0.5" />
            <TB onClick={() => exec('insertUnorderedList')} title="Madde işaretli liste">•</TB>
            <TB onClick={() => exec('insertOrderedList')} title="Numaralı liste">1.</TB>
          </>
        )}
        <span className="w-px h-4 bg-gray-300 mx-0.5" />
        <TB onClick={() => exec('removeFormat')} title="Biçimi temizle"><span className="text-[10px]">✕</span></TB>
        {onSnippetClick && (
          <>
            <span className="w-px h-4 bg-gray-300 mx-0.5" />
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onSnippetClick} title="Hazır açıklamalar"
              className="h-6 px-1.5 flex items-center gap-1 rounded text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
              <StickyNote className="w-3.5 h-3.5" /> Notlar
            </button>
          </>
        )}
      </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); setColorOpen(false); }}
        onInput={() => onChange(ref.current?.innerHTML || '')}
        data-ph={placeholder || ''}
        className="px-2 py-1.5 text-sm outline-none rich-ce"
        style={{ minHeight }}
      />
      <style jsx global>{`
        .rich-ce:empty:before { content: attr(data-ph); color: #9ca3af; pointer-events: none; }
        .rich-ce ul { list-style: disc; padding-left: 20px; margin: 2px 0; }
        .rich-ce ol { list-style: decimal; padding-left: 20px; margin: 2px 0; }
      `}</style>
    </div>
  );
}

function TB({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      className="w-6 h-6 flex items-center justify-center rounded text-xs text-gray-600 hover:bg-gray-200 transition-colors"
    >
      {children}
    </button>
  );
}

// HTML render yardımcısı: düz metin (etiket yok) ise alt satırları <br>'e çevirir
export function renderRichHtml(v: string): string {
  if (!v) return '';
  return /<[a-z][\s\S]*>/i.test(v) ? v : v.replace(/\n/g, '<br>');
}

// Zengin metni (HTML) düz metne çevirir — liste/kart gibi yerlerde temiz gösterim için
export function stripHtml(v: string): string {
  if (!v) return '';
  return v
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
