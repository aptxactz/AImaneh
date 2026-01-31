
import React, { useState, useRef, useCallback } from 'react';
import { AppStatus, ProcessingResult, EditingMode } from './types';
import { generateStudioImage } from './services/geminiService';
import { processLocalImage } from './services/photoService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [mode, setMode] = useState<EditingMode>(EditingMode.SINGLE);
  const [prompt, setPrompt] = useState<string>("");
  const [image1, setImage1] = useState<{ base64: string; mimeType: string } | null>(null);
  const [image2, setImage2] = useState<{ base64: string; mimeType: string } | null>(null);
  const [result, setResult] = useState<ProcessingResult & { engine: string } | null>(null);
  const [error, setError] = useState<{ message: string; type: 'warning' | 'error' } | null>(null);
  
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const applyWatermark = (base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64Image);
        ctx.drawImage(img, 0, 0);
        const fontSize = Math.max(16, Math.floor(canvas.width * 0.03));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const text = "AImaneh Studio";
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fillRect(canvas.width - 250, canvas.height - 60, 250, 60);
        ctx.fillStyle = "white";
        ctx.textAlign = "right";
        ctx.fillText(text, canvas.width - 20, canvas.height - 20);
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      };
    });
  };

  const handleFileChange = (slot: 1 | 2) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const imageData = { base64, mimeType: 'image/jpeg' };
      if (slot === 1) setImage1(imageData);
      else setImage2(imageData);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!prompt && !image1) {
      setError({ message: "Silakan masukkan instruksi atau pilih foto.", type: 'error' });
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setError(null);

    const imagesToProcess = [];
    if (image1) imagesToProcess.push(image1);
    if (mode === EditingMode.COUPLE && image2) imagesToProcess.push(image2);

    let finalUrl = "";
    let engineUsed = "AI Cloud";

    try {
      finalUrl = await generateStudioImage(imagesToProcess, prompt, mode);
    } catch (err: any) {
      console.warn("AI Cloud failed, falling back to Local Engine:", err);
      try {
        finalUrl = await processLocalImage(imagesToProcess, mode, prompt);
        engineUsed = "Local Engine (Free)";
        if (err.message === "API_KEY_MISSING") {
          setError({ message: "Menggunakan Local Engine karena API Key belum terpasang di Vercel.", type: 'warning' });
        }
      } catch (localErr) {
        setStatus(AppStatus.ERROR);
        setError({ message: "Gagal memproses gambar sama sekali.", type: 'error' });
        return;
      }
    }

    const watermarked = await applyWatermark(finalUrl);
    setResult({
      imageUrl: watermarked,
      prompt: prompt || "Auto Enhancement",
      timestamp: Date.now(),
      engine: engineUsed
    });
    setStatus(AppStatus.SUCCESS);
  };

  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.download = `AImaneh-${Date.now()}.jpg`;
    link.href = result.imageUrl;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center font-bold">A</div>
            <h1 className="font-bold text-lg tracking-tight">AI MANEH <span className="text-blue-500">STUDIO</span></h1>
          </div>
          <button onClick={() => {
            // @ts-ignore
            if (window.aistudio) window.aistudio.openSelectKey();
          }} className="text-[10px] text-slate-500 hover:text-white uppercase font-bold border border-slate-800 px-3 py-1 rounded-full transition-all">
            API Config
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 grid lg:grid-cols-2 gap-8">
        {/* Kontrol Panel */}
        <div className="space-y-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800 h-fit">
          <div className="space-y-4">
            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">Instruksi Edit</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Contoh: 'Jadikan hitam putih', 'Buat lebih cerah', 'Gaya vintage sore hari'..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none transition-all"
            />
            
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button onClick={() => setMode(EditingMode.SINGLE)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === EditingMode.SINGLE ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500'}`}>SINGLE</button>
              <button onClick={() => setMode(EditingMode.COUPLE)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === EditingMode.COUPLE ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-500'}`}>COUPLE</button>
            </div>
          </div>

          {/* Dinamis Grid berdasarkan mode */}
          <div className={`grid ${mode === EditingMode.SINGLE ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <div 
              onClick={() => fileInput1Ref.current?.click()} 
              className={`w-full ${mode === EditingMode.SINGLE ? 'aspect-video' : 'aspect-square'} bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group transition-all hover:border-blue-500/50 hover:bg-slate-900`}
            >
              <input type="file" ref={fileInput1Ref} onChange={handleFileChange(1)} className="hidden" accept="image/*" />
              {image1 ? (
                <img src={image1.base64} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center opacity-40 group-hover:opacity-100">
                  <svg className="w-8 h-8 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                  <p className="text-[10px] font-bold tracking-widest uppercase">Pilih Foto Utama</p>
                </div>
              )}
            </div>
            
            {mode === EditingMode.COUPLE && (
              <div 
                onClick={() => fileInput2Ref.current?.click()} 
                className="w-full aspect-square bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl flex items-center justify-center cursor-pointer overflow-hidden group transition-all hover:border-blue-500/50 hover:bg-slate-900"
              >
                <input type="file" ref={fileInput2Ref} onChange={handleFileChange(2)} className="hidden" accept="image/*" />
                {image2 ? (
                  <img src={image2.base64} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center opacity-40 group-hover:opacity-100">
                    <svg className="w-8 h-8 mx-auto mb-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                    <p className="text-[10px] font-bold tracking-widest uppercase">Foto Pasangan</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className={`p-4 rounded-xl text-[11px] font-bold border ${error.type === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
              {error.message}
            </div>
          )}

          <button 
            onClick={handleProcess}
            disabled={status === AppStatus.PROCESSING}
            className={`w-full py-5 rounded-2xl font-black text-sm tracking-widest transition-all ${status === AppStatus.PROCESSING ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 shadow-xl shadow-blue-900/40 active:scale-[0.98]'}`}
          >
            {status === AppStatus.PROCESSING ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                MEMPROSES...
              </div>
            ) : 'GENERATE PHOTO'}
          </button>
        </div>

        {/* Output Panel */}
        <div className="bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden flex flex-col h-[600px] lg:h-full">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-500 tracking-widest uppercase">Preview Studio</span>
              {result && <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter italic">Engine: {result.engine}</span>}
            </div>
            {result && (
              <button onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all shadow-lg">Download</button>
            )}
          </div>

          <div className="flex-1 flex items-center justify-center p-4 bg-slate-950/50 relative">
            {status === AppStatus.PROCESSING ? (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase animate-pulse">Memperbaiki Pencahayaan & Wajah...</p>
              </div>
            ) : result ? (
              <img src={result.imageUrl} className="max-w-full max-h-full rounded-xl shadow-2xl border border-white/5" alt="Result" />
            ) : (
              <div className="text-center opacity-10 uppercase tracking-[0.5em] font-black text-xs">Menunggu Proses</div>
            )}
          </div>
        </div>
      </main>

      <footer className="p-8 text-center text-slate-600">
        <p className="text-[9px] font-black tracking-[0.6em] uppercase">AImaneh Studio &bull; Built with local & cloud engines &bull; 2026</p>
      </footer>
    </div>
  );
};

export default App;
