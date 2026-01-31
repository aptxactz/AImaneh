
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppStatus, ProcessingResult, EditingMode } from './types';
import { generateStudioImage } from './services/geminiService';

/**
 * Interface untuk interaksi dengan dialog pemilihan key jika diperlukan,
 * namun tidak lagi diwajibkan untuk akses awal.
 * Menggunakan inlined type dalam declare global untuk menghindari konflik modifier dan tipe.
 */
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

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

  const handleOpenKeySelector = async () => {
    try {
      await window.aistudio.openSelectKey();
      setError(null);
    } catch (err) {
      console.error("Gagal membuka pemilih kunci:", err);
    }
  };

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

      setResult({
        imageUrl: generatedUrl,
        prompt: prompt || "AI Studio Enhancement",
        timestamp: Date.now()
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      
      const errorMessage = err.message || "";
      // Handle cases where API key is required or permission is denied or project not found
      // Based on Gemini API guidelines for handling missing or invalid entities
      if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("Requested entity was not found")) {
        setError({ message: "Izin API ditolak atau kunci tidak valid. Silakan pilih API Key dari project GCP berbayar." });
        // Prompt for key selection immediately
        await window.aistudio.openSelectKey();
      } else {
        setError({ message: "Gagal memproses. Pastikan koneksi stabil dan instruksi jelas." });
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
            <span className="text-emerald-400 animate-pulse">Gemini Flash Active</span>
            <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
            <button onClick={handleOpenKeySelector} className="hover:text-blue-400 transition-colors uppercase">Select API Key</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <section className="space-y-6 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              AI Photo Instruction
            </h2>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Apa yang ingin Anda ubah?</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Contoh: 'Ubah wajah jadi lebih tirus dengan pencahayaan studio', 'Jadikan seperti foto majalah', atau 'Generate pria tampan di pegunungan'..."
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none placeholder:text-slate-700 font-medium"
              />
            </div>
            
            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button 
                onClick={() => setMode(EditingMode.SINGLE)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${mode === EditingMode.SINGLE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Single Image
              </button>
              <button 
                onClick={() => setMode(EditingMode.COUPLE)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${mode === EditingMode.COUPLE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Couple Mode
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`grid ${mode === EditingMode.SINGLE ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{mode === EditingMode.SINGLE ? 'Upload Reference' : 'Person 1'}</label>
                <div onClick={() => fileInput1Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${image1 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                  <input type="file" ref={fileInput1Ref} onChange={handleFileChange(1)} accept="image/*" className="hidden" />
                  {image1 ? (
                    <div className="relative w-full h-full p-2">
                      <img src={image1.base64} alt="P1" className="w-full h-full object-cover rounded-lg" />
                    </div>
                  ) : (
                    <div className="text-center p-2 opacity-40">
                      <svg xmlns="http://www.w3.org/2000/sh" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                      <p className="text-[10px] font-black uppercase tracking-widest">Optional</p>
                    </div>
                  )}
                </div>
              </div>

              {mode === EditingMode.COUPLE && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Person 2</label>
                  <div onClick={() => fileInput2Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${image2 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                    <input type="file" ref={fileInput2Ref} onChange={handleFileChange(2)} accept="image/*" className="hidden" />
                    {image2 ? (
                      <div className="relative w-full h-full p-2">
                        <img src={image2.base64} alt="P2" className="w-full h-full object-cover rounded-lg" />
                      </div>
                    ) : (
                      <div className="text-center p-2 opacity-40">
                        <svg xmlns="http://www.w3.org/2000/sh" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <p className="text-[10px] font-black uppercase tracking-widest">Optional</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-xs flex gap-3 items-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error.message}</span>
              </div>
            )}

            <button 
              onClick={handleProcess}
              disabled={status === AppStatus.PROCESSING} 
              className={`w-full py-5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-3 tracking-[0.2em] uppercase ${status === AppStatus.PROCESSING ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/40'}`}
            >
              {status === AppStatus.PROCESSING ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  AI PROCESSING...
                </>
              ) : 'GENERATE'}
            </button>
          </div>
        </section>

        <section className="h-full flex flex-col gap-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[500px]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/95 backdrop-blur-md">
              <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Output Result</span>
                 <span className="text-xs text-slate-500 font-medium italic">Gemini Engine &bull; High Definition</span>
              </div>
              {result && (
                <button onClick={handleDownload} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-lg active:scale-95">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  SAVE PHOTO
                </button>
              )}
            </div>
            
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-6 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:30px_30px]">
              {status === AppStatus.PROCESSING ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest animate-pulse">Processing via Gemini AI...</p>
                </div>
              ) : result ? (
                <div className="relative group max-w-full">
                  <img src={result.imageUrl} alt="Result" className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-2xl canvas-shadow border border-white/5" />
                  <div className="absolute top-4 left-4 bg-emerald-600/80 backdrop-blur-md text-[8px] font-black px-2 py-1 rounded-md uppercase tracking-widest shadow-lg">HD Quality</div>
                </div>
              ) : (
                <div className="text-slate-800 text-center opacity-20 group">
                   <svg className="w-24 h-24 mx-auto group-hover:scale-110 transition-transform duration-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                   <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em]">Ready for AI Transformation</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 group hover:border-blue-500/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-black text-xs">AI</div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Powered By</p>
                   <p className="text-xs font-bold text-slate-300">Gemini AI</p>
                </div>
             </div>
             <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-3 group hover:border-emerald-500/50 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Availability</p>
                   <p className="text-xs font-bold text-slate-300">Professional Engine</p>
                </div>
             </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-900 py-10 bg-slate-950 text-center">
        <p className="text-slate-600 text-[9px] font-black tracking-[0.5em] uppercase">
          AImaneh Studio &bull; Free Professional Suite BY KRISTOGRAPH &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default App;
