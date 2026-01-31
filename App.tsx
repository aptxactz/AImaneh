
import React, { useState, useRef, useCallback } from 'react';
import { AppStatus, ProcessingResult, EditingMode } from './types';
import { processImage } from './services/geminiService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [mode, setMode] = useState<EditingMode>(EditingMode.SINGLE);
  const [prompt, setPrompt] = useState('');
  const [image1, setImage1] = useState<{ base64: string; mimeType: string } | null>(null);
  const [image2, setImage2] = useState<{ base64: string; mimeType: string } | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<{ message: string } | null>(null);
  
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFileChange = (slot: 1 | 2) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const imageData = { base64, mimeType: file.type };
      if (slot === 1) setImage1(imageData);
      else setImage2(imageData);
      setError(null);
    };
    reader.onerror = () => setError({ message: "Gagal membaca file gambar." });
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!prompt.trim() && !image1 && !image2) {
      setError({ message: "Berikan instruksi atau unggah foto terlebih dahulu." });
      return;
    }

    if (mode === EditingMode.COUPLE && (!image1 || !image2) && prompt.trim() === "") {
      setError({ message: "Mode Couple memerlukan dua foto orang berbeda." });
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setError(null);

    try {
      const imagesToProcess = [];
      if (image1) imagesToProcess.push(image1);
      // Only include image2 if we are actually in couple mode
      if (mode === EditingMode.COUPLE && image2) imagesToProcess.push(image2);

      const generatedUrl = await processImage(prompt, imagesToProcess);

      setResult({
        imageUrl: generatedUrl,
        prompt: prompt,
        timestamp: Date.now()
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setStatus(AppStatus.ERROR);
      setError({ message: err.message || "Terjadi kesalahan saat memproses permintaan." });
    }
  };

  const handleDownload = useCallback(() => {
    if (!result) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.download = `AI-MANEH-PRO-${Date.now()}.jpg`;
      link.href = dataUrl;
      link.click();
    };
    img.src = result.imageUrl;
  }, [result]);

  const reset = () => {
    setResult(null);
    setImage1(null);
    setImage2(null);
    setPrompt('');
    setStatus(AppStatus.IDLE);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col transition-all duration-500">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl italic group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/20">A</div>
            <h1 className="text-xl font-bold tracking-tight">
              AI MANEH <span className="text-blue-500">STUDIO PRO</span> <span className="text-slate-500 text-xs font-normal ml-1 border border-slate-700 px-2 py-0.5 rounded-full">by Kristograph</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            <span>HD Engine v2.5</span>
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <span>No Watermark</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <section className="space-y-6 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Editor Studio
              </h2>
            </div>
            
            {/* Mode Selection Tabs */}
            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button 
                onClick={() => setMode(EditingMode.SINGLE)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${mode === EditingMode.SINGLE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Single Photo
              </button>
              <button 
                onClick={() => setMode(EditingMode.COUPLE)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${mode === EditingMode.COUPLE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Couple Photo
              </button>
            </div>
            
            <p className="text-sm text-slate-400 leading-relaxed">
              {mode === EditingMode.SINGLE 
                ? "Edit satu foto dengan instruksi bebas. Identitas wajah akan dipertahankan." 
                : "Gabungkan dua foto orang berbeda menjadi satu frame couple yang romantis."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Instruksi Visual</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === EditingMode.SINGLE 
                  ? "Contoh: 'Ubah latar belakang menjadi pantai saat sunset'" 
                  : "Contoh: 'Foto couple romantis bergandengan tangan di pegunungan salju'"}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all min-h-[120px] resize-none text-base shadow-inner"
              />
            </div>

            <div className={`grid ${mode === EditingMode.SINGLE ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              {/* Foto 1 (Selalu tampil) */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {mode === EditingMode.SINGLE ? 'Foto Sumber' : 'Orang Pertama'}
                </label>
                <div onClick={() => fileInput1Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${image1 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                  <input type="file" ref={fileInput1Ref} onChange={handleFileChange(1)} accept="image/*" className="hidden" />
                  {image1 ? (
                    <div className="relative w-full h-full p-2">
                      <img src={image1.base64} alt="P1" className="w-full h-full object-cover rounded-lg shadow-md" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); setImage1(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                  ) : (
                    <div className="text-center p-2 group">
                      <svg xmlns="http://www.w3.org/2000/sh" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mx-auto mb-2 group-hover:text-blue-500 transition-colors"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Click to Upload</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Foto 2 (Hanya tampil jika mode Couple) */}
              {mode === EditingMode.COUPLE && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Orang Kedua</label>
                  <div onClick={() => fileInput2Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${image2 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                    <input type="file" ref={fileInput2Ref} onChange={handleFileChange(2)} accept="image/*" className="hidden" />
                    {image2 ? (
                      <div className="relative w-full h-full p-2">
                        <img src={image2.base64} alt="P2" className="w-full h-full object-cover rounded-lg shadow-md" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setImage2(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                    ) : (
                      <div className="text-center p-2 group">
                        <svg xmlns="http://www.w3.org/2000/sh" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mx-auto mb-2 group-hover:text-blue-500 transition-colors"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Click to Upload</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm flex gap-3 items-center">
                <svg className="shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error.message}</span>
              </div>
            )}

            <button type="submit" disabled={status === AppStatus.PROCESSING} className={`w-full py-5 rounded-xl font-black text-lg transition-all flex items-center justify-center gap-3 tracking-wide ${status === AppStatus.PROCESSING ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-700 to-blue-500 hover:from-blue-600 hover:to-blue-400 text-white shadow-xl shadow-blue-500/20 active:scale-[0.98]'}`}>
              {status === AppStatus.PROCESSING ? (
                <>
                  <div className="w-6 h-6 border-3 border-slate-500 border-t-white rounded-full animate-spin"></div>
                  PROSES RENDER...
                </>
              ) : (
                <>
                  {mode === EditingMode.SINGLE ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                  )}
                  GENERATE PHOTO
                </>
              )}
            </button>
          </form>
        </section>

        <section className="h-full flex flex-col gap-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[500px]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 backdrop-blur-md">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Output High-Res</span>
                 <span className="text-xs text-slate-500 font-medium">Clear Export Ready</span>
              </div>
              {result && (
                <button onClick={handleDownload} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/40 active:scale-95 border border-emerald-500/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  UNDUH HASIL
                </button>
              )}
            </div>
            
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
              {status === AppStatus.PROCESSING ? (
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                  </div>
                  <p className="text-xs text-slate-500 font-black uppercase tracking-widest animate-pulse">Sedang Memproses Detail Studio...</p>
                </div>
              ) : result ? (
                <div className="relative group max-w-full">
                  <img src={result.imageUrl} alt="Result" className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-2xl border border-slate-800 transition-transform duration-500 group-hover:scale-[1.01]" />
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold text-white/70 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                     HD ACTIVE
                  </div>
                </div>
              ) : (
                <div className="text-slate-800 text-center space-y-4 max-w-xs">
                   <div className="w-20 h-20 bg-slate-900/50 rounded-full flex items-center justify-center border border-slate-800 mx-auto">
                      <svg className="w-10 h-10 opacity-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                   </div>
                   <p className="text-sm font-medium italic opacity-50 tracking-tight">Pilih mode edit dan upload foto untuk memulai render AI kualitas tinggi.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-4">
             <div className="flex-1 p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Export</p>
                   <p className="text-xs font-bold text-slate-300">Clean HD (No Watermark)</p>
                </div>
             </div>
             <div className="flex-1 p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Security</p>
                   <p className="text-xs font-bold text-slate-300">Identity Preservation</p>
                </div>
             </div>
          </div>
        </section>
      </main>

      <canvas ref={canvasRef} className="hidden" />

      <footer className="mt-auto border-t border-slate-900 py-10 bg-slate-950/80 text-center">
        <p className="text-slate-600 text-[10px] font-black tracking-[0.4em] uppercase">
          &copy; {new Date().getFullYear()} AI MANEH &bull; Professional AI Studio by Kristograph
        </p>
      </footer>
    </div>
  );
};

export default App;
