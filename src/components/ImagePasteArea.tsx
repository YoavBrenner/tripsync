import React, { useRef, useCallback, useEffect } from 'react';
import { ImageIcon, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (b64: string) => void;
  label?: string;
}

function compressImage(source: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      const MAX_W = 900;
      const ratio = img.width > MAX_W ? MAX_W / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = reject;
    img.src = url;
  });
}

const ImagePasteArea: React.FC<Props> = ({ value, onChange, label = 'צלם מסך / תמונת כרטיס' }) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File | Blob) => {
    try {
      const b64 = await compressImage(file);
      onChange(b64);
    } catch { /* ignore */ }
  }, [onChange]);

  // Global paste listener — fires whenever the user presses Ctrl+V anywhere on the page
  useEffect(() => {
    if (value) return; // already have an image, don't listen
    const handler = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imgItem = items.find(i => i.type.startsWith('image/'));
      if (imgItem) {
        e.preventDefault();
        const blob = imgItem.getAsFile();
        if (blob) handleFile(blob);
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [value, handleFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleFile(file);
  }, [handleFile]);

  if (value) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <img src={value} alt="screenshot" className="w-full object-contain max-h-64 bg-slate-50" />
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute top-2 left-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-all"
        >
          <X className="w-4 h-4 text-white" />
        </button>
        <div className="absolute bottom-2 right-2 bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-full">
          צילום מסך שמור
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}
      onClick={() => fileRef.current?.click()}
      className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-all text-slate-400 hover:text-blue-500 select-none"
    >
      <ImageIcon className="w-7 h-7" />
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-center leading-relaxed">
        הדבק מסך עם{' '}
        <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 font-mono text-[11px]">Ctrl+V</kbd>
        {' '}בכל מקום בדף, או לחץ לבחירת קובץ
      </p>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
};

export default ImagePasteArea;
