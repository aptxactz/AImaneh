
import React, { useState, useRef, useCallback } from 'react';
import { AppStatus, ProcessingResult, EditingMode } from './types';
import { processLocalImage } from './services/photoService';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [mode, setMode] = useState<EditingMode>(EditingMode.SINGLE);
  const [image1, setImage1] = useState<{ base64: string; mimeType: string } | null>(null);
  const [image2, setImage2] = useState<{ base64: string; mimeType: string } | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<{ message: string } | null>(null);
  
  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

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

  const handleProcess = async () => {
    if (!image1 && (mode === EditingMode.SINGLE)) {
      setError({ message: "Silakan unggah foto terlebih dahulu." });
      return;
    }
    if (mode === EditingMode.COUPLE && (!image1 || !image2)) {
      setError({ message: "Mode Couple memerlukan dua foto." });
      return;
    }

    setStatus(AppStatus.PROCESSING);
    setError(null);

    try {
      const imagesToProcess = [];
      if (image1) imagesToProcess.push(image1);
      if (mode === EditingMode.COUPLE && image2) imagesToProcess.push(image2);

      const generatedUrl = await processLocalImage(imagesToProcess, mode);

      setResult({
        imageUrl: generatedUrl,
        prompt: "Local Enhancement",
        timestamp: Date.now()
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setStatus(AppStatus.ERROR);
      setError({ message: "Gagal memproses gambar secara lokal." });
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
              AI MANEH <span className="text-blue-500">STUDIO</span> <span className="text-slate-500 text-[10px] font-normal ml-1 border border-slate-700 px-2 py-0.5 rounded-full tracking-widest uppercase">BY KRISTOGRAPH</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            <span>High Fidelity Export</span>
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <span>No Server Required</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <section className="space-y-6 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                Studio Configuration
              </h2>
            </div>
            
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
                Couple Merge
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`grid ${mode === EditingMode.SINGLE ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              {/* Foto 1 */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {mode === EditingMode.SINGLE ? 'Main Image' : 'First Person'}
                </label>
                <div onClick={() => fileInput1Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${image1 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                  <input type="file" ref={fileInput1Ref} onChange={handleFileChange(1)} accept="image/*" className="hidden" />
                  {image1 ? (
                    <div className="relative w-full h-full p-2">
                      <img src={image1.base64} alt="P1" className="w-full h-full object-cover rounded-lg" />
                      <button type="button" onClick={(e) => { e.stopPropagation(); setImage1(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                  ) : (
                    <div className="text-center p-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/sh" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      <p className="text-[10px] font-black uppercase">Upload Image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Foto 2 */}
              {mode === EditingMode.COUPLE && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Second Person</label>
                  <div onClick={() => fileInput2Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${image2 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                    <input type="file" ref={fileInput2Ref} onChange={handleFileChange(2)} accept="image/*" className="hidden" />
                    {image2 ? (
                      <div className="relative w-full h-full p-2">
                        <img src={image2.base64} alt="P2" className="w-full h-full object-cover rounded-lg" />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setImage2(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                    ) : (
                      <div className="text-center p-2 opacity-40">
                        <svg xmlns="http://www.w3.org/2000/sh" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <p className="text-[10px] font-black uppercase">Upload Image</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-xs flex gap-3 items-center">
                <svg className="shrink-0" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error.message}</span>
              </div>
            )}

            <button 
              onClick={handleProcess}
              disabled={status === AppStatus.PROCESSING} 
              className={`w-full py-5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-3 tracking-[0.2em] uppercase ${status === AppStatus.PROCESSING ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/40'}`}
            >
              {status === AppStatus.PROCESSING ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-500 border-t-white rounded-full animate-spin"></div>
                  Rendering...
                </>
              ) : (
                'Generate Studio Result'
              )}
            </button>
          </div>
        </section>

        <section className="h-full flex flex-col gap-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[400px]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 backdrop-blur-md">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Output Monitor</span>
                 <span className="text-xs text-slate-500 font-medium italic">Watermark Included</span>
              </div>
              {result && (
                <button onClick={handleDownload} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  DOWNLOAD JPG
                </button>
              )}
            </div>
            
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:30px_30px]">
              {status === AppStatus.PROCESSING ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Optimizing Textures...</p>
                </div>
              ) : result ? (
                <div className="relative group max-w-full">
                  <img src={result.imageUrl} alt="Result" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl canvas-shadow" />
                </div>
              ) : (
                <div className="text-slate-800 text-center opacity-20">
                   <svg className="w-20 h-20 mx-auto" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 15l5.12-5.12a3 3 0 0 1 4.24 0L18 15"/><path d="M15 13l2.5-2.5a1.5 1.5 0 0 1 2.12 0L21 12"/><circle cx="9" cy="9" r="2"/></svg>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Format</p>
                   <p className="text-xs font-bold text-slate-300">Ultra JPEG</p>
                </div>
             </div>
             <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Stability</p>
                   <p className="text-xs font-bold text-slate-300">No API Needed</p>
                </div>
             </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-900 py-10 bg-slate-950 text-center">
        <p className="text-slate-600 text-[9px] font-black tracking-[0.5em] uppercase">
          AImaneh Studio &bull; Professional Studio BY KRISTOGRAPH &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default App;