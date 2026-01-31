
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppStatus, ProcessingResult, EditingMode } from './types';
import { generateStudioImage } from './services/geminiService';

declare global {
  // Defining AIStudio interface to match the expected global type
  interface AIStudio {
    hasSelectedApiKey(): Promise<boolean>;
    openSelectKey(): Promise<void>;
  }

  interface Window {
    // Adding readonly modifier and using AIStudio type to fix TS errors and match environment
    readonly aistudio: AIStudio;
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

  // Check if API key is selected on mount to ensure user is ready
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        try {
          await window.aistudio.hasSelectedApiKey();
        } catch (err) {
          console.error("Error checking API key status:", err);
        }
      }
    };
    checkKey();
  }, []);

  // Fungsi untuk mengecilkan gambar sebelum dikirim ke AI (menghindari error payload besar di mobile)
  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
    });
  };

  // Fungsi untuk menambahkan Watermark "AImaneh"
  const addWatermark = (base64Image: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Image;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64Image);

        // Gambar utama
        ctx.drawImage(img, 0, 0);

        // Styling Watermark
        const fontSize = Math.max(20, canvas.width * 0.03);
        ctx.font = `bold ${fontSize}px Inter, sans-serif`;
        const text = "AImaneh Studio";
        const textWidth = ctx.measureText(text).width;
        
        // Background Hitam Transparan untuk Watermark
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(canvas.width - textWidth - 30, canvas.height - fontSize - 30, textWidth + 20, fontSize + 15);

        // Teks Putih
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.fillText(text, canvas.width - textWidth - 20, canvas.height - 25);

        resolve(canvas.toDataURL('image/jpeg', 0.98));
      };
    });
  };

  const handleOpenKeySelector = async () => {
    try {
      if (window.aistudio) {
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
      const originalBase64 = event.target?.result as string;
      // Resizing langsung saat upload untuk efisiensi
      const optimizedBase64 = await resizeImage(originalBase64);
      const imageData = { base64: optimizedBase64, mimeType: 'image/jpeg' };
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

    // Mandatory API Key check before processing
    if (window.aistudio) {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Proceed after triggering selection to avoid race conditions as per guidelines
      }
    }

    setStatus(AppStatus.PROCESSING);
    setError(null);

    try {
      const imagesToProcess = [];
      if (image1) imagesToProcess.push(image1);
      if (mode === EditingMode.COUPLE && image2) imagesToProcess.push(image2);

      const generatedUrl = await generateStudioImage(imagesToProcess, prompt, mode);
      
      // Tambahkan Watermark secara lokal sebelum ditampilkan
      const watermarkedUrl = await addWatermark(generatedUrl);

      setResult({
        imageUrl: watermarkedUrl,
        prompt: prompt || "AI Studio Enhancement",
        timestamp: Date.now()
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      setStatus(AppStatus.ERROR);
      
      const errorMessage = err.message || "";
      if (errorMessage === "API_KEY_MISSING") {
        setError({ message: "API Key belum terpasang. Silakan pilih API Key Anda." });
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else if (errorMessage.includes("403") || errorMessage.includes("PERMISSION_DENIED") || errorMessage.includes("Requested entity was not found")) {
        // Handle case where API key project is invalid or missing billing as per guidelines
        setError({ message: "Akses ditolak atau project tidak ditemukan. Silakan pilih API Key dari project berbayar yang valid." });
        if (window.aistudio) await window.aistudio.openSelectKey();
      } else if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests")) {
        setError({ message: "Terlalu banyak permintaan. Silakan tunggu beberapa detik." });
      } else {
        setError({ message: `Error: ${errorMessage.substring(0, 50)}... Coba instruksi lain.` });
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
              AI MANEH <span className="text-blue-500">STUDIO</span>
            </h1>
          </div>
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
            <button onClick={handleOpenKeySelector} className="hover:text-blue-400 transition-colors border border-slate-800 px-3 py-1 rounded-full">Settings</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <section className="space-y-6 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              AI Instruction
            </h2>

            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Jelaskan detail wajah, gaya, atau edit yang diinginkan..."
              className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all resize-none placeholder:text-slate-700 font-medium"
            />
            
            <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button 
                onClick={() => setMode(EditingMode.SINGLE)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${mode === EditingMode.SINGLE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                Single
              </button>
              <button 
                onClick={() => setMode(EditingMode.COUPLE)}
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${mode === EditingMode.COUPLE ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
              >
                Couple
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className={`grid ${mode === EditingMode.SINGLE ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div onClick={() => fileInput1Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${image1 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                <input type="file" ref={fileInput1Ref} onChange={handleFileChange(1)} accept="image/*" className="hidden" />
                {image1 ? <img src={image1.base64} alt="P1" className="w-full h-full object-cover rounded-lg p-1" /> : <span className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Photo 1</span>}
              </div>

              {mode === EditingMode.COUPLE && (
                <div onClick={() => fileInput2Ref.current?.click()} className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${image2 ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}>
                  <input type="file" ref={fileInput2Ref} onChange={handleFileChange(2)} accept="image/*" className="hidden" />
                  {image2 ? <img src={image2.base64} alt="P2" className="w-full h-full object-cover rounded-lg p-1" /> : <span className="text-[10px] uppercase opacity-40 font-bold tracking-widest">Photo 2</span>}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-[11px] font-medium leading-relaxed">
                {error.message}
              </div>
            )}

            <button 
              onClick={handleProcess}
              disabled={status === AppStatus.PROCESSING} 
              className={`w-full py-5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-3 tracking-[0.2em] uppercase ${status === AppStatus.PROCESSING ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/40'}`}
            >
              {status === AppStatus.PROCESSING ? 'PROCESSING...' : 'GENERATE PHOTO'}
            </button>
          </div>
        </section>

        <section className="h-full flex flex-col gap-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[400px]">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/95">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">Output Result</span>
              {result && (
                <button onClick={handleDownload} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 uppercase tracking-widest">
                  Download JPEG
                </button>
              )}
            </div>
            
            <div className="flex-1 relative bg-slate-950 flex items-center justify-center p-4">
              {status === AppStatus.PROCESSING ? (
                <div className="text-center space-y-4">
                  <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">AI is working on details...</p>
                </div>
              ) : result ? (
                <div className="relative max-w-full">
                  <img src={result.imageUrl} alt="Result" className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-2xl border border-white/5" />
                </div>
              ) : (
                <div className="opacity-20 text-center uppercase tracking-[0.3em] font-bold text-xs">Waiting for prompt</div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-slate-900 py-6 bg-slate-950 text-center">
        <p className="text-slate-600 text-[9px] font-black tracking-[0.5em] uppercase">
          AImaneh Studio &bull; BY KRISTOGRAPH &bull; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
};

export default App;
