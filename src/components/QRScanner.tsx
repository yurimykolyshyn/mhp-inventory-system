import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { XIcon, CameraIcon, KeyboardIcon } from './icons';

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

type State = 'loading' | 'scanning' | 'error' | 'manual';

const QRScanner: React.FC<Props> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const scanned = useRef(false);
  const [state, setState] = useState<State>('loading');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { start(); return stop; }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setState('scanning');
        rafRef.current = requestAnimationFrame(tick);
      }
    } catch { setState('error'); }
  };

  const stop = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const tick = () => {
    if (scanned.current) return;
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) { rafRef.current = requestAnimationFrame(tick); return; }
    const ctx = c.getContext('2d')!;
    c.width = v.videoWidth; c.height = v.videoHeight;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    const result = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
    if (result) { scanned.current = true; stop(); onScan(result.data); return; }
    rafRef.current = requestAnimationFrame(tick);
  };

  const submit = () => {
    if (!code.trim()) { setErr('Введіть код'); return; }
    stop(); onScan(code.trim());
  };
  const close = () => { stop(); onClose(); };

  if (state === 'error' || state === 'manual') {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col">
        <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={close} />
        <div className="bg-white rounded-t-3xl shadow-2xl p-6 pb-safe-or-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-neutral-900">Введення коду</h3>
              {state === 'error' && <p className="text-xs text-neutral-500 mt-0.5">Камера недоступна — введіть код вручну</p>}
            </div>
            <button onClick={close} className="p-2 rounded-xl text-neutral-400 hover:bg-neutral-100"><XIcon className="w-5 h-5" /></button>
          </div>
          {state === 'error' && (
            <div className="flex gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <CameraIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-semibold">Немає доступу до камери</p>
                <p className="text-xs mt-0.5">Дозвольте доступ у налаштуваннях браузера або введіть код нижче</p>
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-neutral-700">Інвентарний код обладнання</label>
            <input
              type="text" value={code} onChange={e => { setCode(e.target.value); setErr(''); }}
              placeholder="напр. ЦБ30025821"
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus onKeyDown={e => e.key === 'Enter' && submit()}
            />
            {err && <p className="text-xs text-danger">{err}</p>}
          </div>
          <div className="flex gap-3">
            {state === 'error' && (
              <button onClick={() => { setState('loading'); start(); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold border-2 border-neutral-200 text-neutral-600 hover:bg-neutral-50">
                <CameraIcon className="w-4 h-4" /> Спробувати знову
              </button>
            )}
            <button onClick={submit}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary-dark">
              <KeyboardIcon className="w-4 h-4" /> Підтвердити
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="fixed inset-0 z-[60] bg-neutral-900 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-white/70 text-sm">Запит доступу до камери…</p>
        <button onClick={close} className="mt-2 text-white/50 text-sm hover:text-white/80 transition-colors">Скасувати</button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-4 bg-gradient-to-b from-black/80 to-transparent">
        <h3 className="text-white font-semibold">Сканування QR-коду</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => { stop(); setState('manual'); }}
            className="flex items-center gap-1.5 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/20">
            <KeyboardIcon className="w-3.5 h-3.5" /> Ввести вручну
          </button>
          <button onClick={close} className="p-2 text-white rounded-full hover:bg-white/20">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-xl" />
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-primary animate-pulse -translate-y-1/2" />
          </div>
        </div>
        <p className="absolute bottom-8 left-0 right-0 text-center text-white/70 text-sm px-4">
          Наведіть камеру на QR-код обладнання
        </p>
      </div>
    </div>
  );
};

export default QRScanner;
