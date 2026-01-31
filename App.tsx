
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppStatus, ProcessingResult, EditingMode } from './types';
import { generateStudioImage } from './services/geminiService';

// Note: The AIStudio interface and window.aistudio property are already defined 
// in the global environment, so we do not need to redeclare them here.

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [mode, setMode] = useState<EditingMode>(EditingMode.SINGLE);
  const [prompt, setPrompt] = useState<string>("");
  const [image1, setImage1] = useState<{ base64: string; mimeType: string } | null>(null);
  const [image2, setImage2] = useState<{ base64: string; mimeType: string } | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<{ message: string } | null>(null);
  
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  // Optimasi gambar untuk mobile (mengurangi beban payload)
  const optimizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1024; // Ukuran optimal untuk Gemini Image API
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Kompresi jpeg 80%
      };
    });
  };

  // Menambahkan Watermark "AImaneh"
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

        // Desain Watermark AImaneh
        const fontSize = Math.max(16, Math.floor(canvas.width * 0.03));
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const text = "AImaneh Studio";
        const padding = 20;
        const textWidth = ctx.measureText(text).width;

        // Overlay bar di bawah
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(0, canvas.height - fontSize - (padding * 2), canvas.width, fontSize + (padding * 2));

        // Teks Watermark
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.textAlign = "right";
        ctx.fillText(text, canvas.width - padding, canvas.height - padding);

        resolve(canvas.toDataURL('image/jpeg', 0.98));
      };
    });
  };

  const handleOpenKeySelector = async () => {
    try {
      // @ts-ignore - aistudio is globally available but might not be in the type definitions
      if (window.aistudio) {
        // @ts-ignore - aistudio is globally available
        await window.aistudio.openSelectKey();
        setError(null);
      }
    } catch (err) {
      console.error("Gagal membuka pemilih kunci:", err);
    }
  };

  const handleFileChange = (slot: 1 | 2) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const optimized = await optimizeImage(base64);
      const imageData = { base64: optimized, mimeType: 'image/jpeg' };
      if (slot === 1) setImage1(imageData);
      else setImage2(imageData);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (!prompt && !image1) {
      setError({ message: "Silakan unggah foto atau ketik instruksi AI." });
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setError(null);

    try {
      const imagesToProcess = [];
      if (image1) imagesToProcess.push(image1);
      if (mode === EditingMode.COUPLE && image2) imagesToProcess.push(image2);

      const generatedUrl = await generateStudioImage(imagesToProcess, prompt, mode);
      
      // Tambahkan Watermark otomatis
      const finalImageUrl = await applyWatermark(generatedUrl);

      setResult({
        imageUrl: finalImageUrl,
        prompt: prompt || "AI Studio Generation",
        timestamp: Date.now()
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      
      const msg = err.message || "";
      // Handle khusus jika project tidak ditemukan (reset key state)
      if (msg.includes("Requested entity was not found") || msg.includes("PERMISSION_DENIED")) {
        setError({ message: "API Key tidak valid atau project tidak ditemukan. Silakan hubungkan kembali." });
        // @ts-ignore - aistudio is globally available
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else if (msg === "API_KEY_MISSING") {
        setError({ message: "API Key belum diatur di Vercel. Gunakan tombol Settings untuk input manual." });
        // @ts-ignore - aistudio is globally available
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else {
        setError({ message: "Terjadi kesalahan pada server AI. Pastikan instruksi jelas dan coba lagi." });
      }
    }
  };

  const handleDownload = useCallback(() => {
    if (!result) return;
    const link = document.createElement('a');
    link.download = `AImaneh-Studio-${Date.now()}.jpg`;
    link.href = result.imageUrl;
    link.click();
  }, [result]);

  const reset = () => {
    setResult(null);
    setImage1(null);
    setImage2(null);
    setPrompt("");
    setStatus(AppStatus.IDLE);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl italic shadow-lg shadow-blue-500/20">A</div>
            <h1 className="text-xl font-bold tracking-tight">AI MANEH <span className="text-blue-500">STUDIO</span></h1>
          </div>
          <button onClick={handleOpenKeySelector} className="text-[10px] font-bold text-slate-500 hover:text-blue-400 border border-slate-800 px-3 py-1 rounded-full uppercase tracking-widest transition-all">Settings</button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <section className="space-y-6 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Studio Instructions
            </h2>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Jelaskan perubahan yang Anda inginkan (semua bahasa)..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none"
            />
            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button onClick={() => setMode(EditingMode.SINGLE)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${mode === EditingMode.SINGLE ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Single</button>
              <button onClick={() => setMode(EditingMode.COUPLE)} className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${mode === EditingMode.COUPLE ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Couple</button>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`grid ${mode === EditingMode.SINGLE ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div onClick={() => fileInput1Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden ${image1 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                <input type="file" ref={fileInput1Ref} onChange={handleFileChange(1)} accept="image/*" className="hidden" />
                {image1 ? <img src={image1.base64} alt="P1" className="w-full h-full object-cover" /> : <span className="text-[10px] font-black uppercase opacity-40">Photo 1</span>}
              </div>
              {mode === EditingMode.COUPLE && (
                <div onClick={() => fileInput2Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer overflow-hidden ${image2 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                  <input type="file" ref={fileInput2Ref} onChange={handleFileChange(2)} accept="image/*" className="hidden" />
                  {image2 ? <img src={image2.base64} alt="P2" className="w-full h-full object-cover" /> : <span className="text-[10px] font-black uppercase opacity-40">Photo 2</span>}
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-xs flex gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {error.message}
              </div>
            )}

            <button 
              onClick={handleProcess}
              disabled={status === AppStatus.PROCESSING}
              className={`w-full py-5 rounded-xl font-black text-sm tracking-[0.2em] uppercase transition-all ${status === AppStatus.PROCESSING ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/40 active:scale-[0.98]'}`}
            >
              {status === AppStatus.PROCESSING ? 'AI is Processing...' : 'Generate Magic'}
            </button>
          </div>
        </section>

        <section className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col min-h-[450px]">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/95">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Result View</span>
            {result && (
              <button onClick={handleDownload} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Download JPEG</button>
            )}
          </div>
          <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-4">
            {status === AppStatus.PROCESSING ? (
              <div className="text-center space-y-4">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Fine-tuning facial details...</p>
              </div>
            ) : result ? (
              <img src={result.imageUrl} alt="Result" className="max-w-full max-h-[60vh] rounded-lg shadow-2xl border border-white/5" />
            ) : (
              <div className="opacity-10 text-center uppercase tracking-[0.4em] font-black text-xs">Waiting for prompt</div>
            )}
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-900 py-6 bg-slate-950 text-center">
        <p className="text-slate-600 text-[9px] font-black tracking-[0.5em] uppercase">AImaneh Studio &bull; High-End AI Portraits &bull; 2025</p>
      </footer>
    </div>
  );
};

export default App;
