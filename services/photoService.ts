
export interface ImageInput {
  base64: string;
  mimeType: string;
}

const parseInstructionsToFilters = (prompt: string): string => {
  const p = prompt.toLowerCase();
  let filters = "contrast(1.1) saturate(1.1)"; // Base studio look

  // Deteksi Hitam Putih (Berbagai Bahasa)
  if (/hitam|putih|black|white|monochrome|grayscale|abu|gray|bw/.test(p)) {
    filters += " grayscale(1) contrast(1.2)";
  }
  
  // Deteksi Vintage/Klasik
  if (/vintage|jadul|klasik|classic|old|retro|sepia|lampau/.test(p)) {
    filters += " sepia(0.8) contrast(0.9) brightness(1.1)";
  }

  // Deteksi Cerah/High Exposure
  if (/cerah|terang|bright|light|siang|putih banget/.test(p)) {
    filters += " brightness(1.4) contrast(1.1)";
  }

  // Deteksi Gelap/Dramatis/Misterius
  if (/gelap|dark|malam|night|misteri|dramatis|noir/.test(p)) {
    filters += " brightness(0.6) contrast(1.5) saturate(0.8)";
  }

  // Deteksi Warna Tajam/Vibrant
  if (/tajam|warna|vibrant|kontras|sharp|color|pop|ngejreng/.test(p)) {
    filters += " saturate(2.5) contrast(1.4)";
  }

  // Deteksi Soft/Blur/Mimpi
  if (/soft|lembut|blur|kabur|dreamy|halus/.test(p)) {
    filters += " blur(2px) brightness(1.1)";
  }

  // Deteksi Biru/Dingin
  if (/dingin|cool|biru|blue|ocean|es/.test(p)) {
    filters += " hue-rotate(180deg) saturate(1.2)";
  }

  // Deteksi Hangat/Sore/Emas
  if (/hangat|warm|sore|sunset|gold|emas|kuning/.test(p)) {
    filters += " sepia(0.3) saturate(1.8) brightness(1.05)";
  }

  return filters;
};

// Fungsi untuk membuat background jika tidak ada foto
const createStudioBackground = (ctx: CanvasRenderingContext2D, width: number, height: number, prompt: string) => {
  const p = prompt.toLowerCase();
  let color1 = "#0f172a"; // Default dark
  let color2 = "#1e293b";

  if (/sore|sunset|hangat|warm/.test(p)) {
    color1 = "#451a03"; color2 = "#92400e";
  } else if (/biru|dingin|ocean|cool/.test(p)) {
    color1 = "#082f49"; color2 = "#0369a1";
  } else if (/hutan|hijau|green|nature/.test(p)) {
    color1 = "#052e16"; color2 = "#166534";
  } else if (/mewah|gold|emas|luxury/.test(p)) {
    color1 = "#1c1917"; color2 = "#78350f";
  }

  const gradient = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, width);
  gradient.addColorStop(0, color2);
  gradient.addColorStop(1, color1);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Tambahkan aksen cahaya studio
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(width * 0.7, height * 0.3, width * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;
};

export const processLocalImage = async (
  images: ImageInput[],
  mode: 'SINGLE' | 'COUPLE',
  prompt: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    
    if (!ctx) {
      reject(new Error("Gagal menginisialisasi engine grafis."));
      return;
    }

    const loadImg = (src: string): Promise<HTMLImageElement> => {
      return new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    };

    const process = async () => {
      try {
        const hasImages = images.length > 0;
        const filterStack = parseInstructionsToFilters(prompt);
        
        if (!hasImages) {
          // MODE: INSTRUCTION ONLY (GENERATE DARI NOL)
          canvas.width = 1200;
          canvas.height = 1200;
          createStudioBackground(ctx, canvas.width, canvas.height, prompt);
          
          ctx.filter = filterStack;
          // Gambar siluet atau teks artistik sebagai pengganti subjek
          ctx.fillStyle = "rgba(255,255,255,0.1)";
          ctx.font = "bold 80px Inter";
          ctx.textAlign = "center";
          ctx.fillText("AImaneh Generation", canvas.width/2, canvas.height/2);
          ctx.filter = "none";
        } else {
          // MODE: EDIT FOTO YANG DIUNGGAH
          const loadedImages = await Promise.all(images.map(img => loadImg(img.base64)));
          
          if (mode === 'SINGLE' || loadedImages.length === 1) {
            const img = loadedImages[0];
            canvas.width = img.width;
            canvas.height = img.height;
            
            ctx.filter = filterStack;
            ctx.drawImage(img, 0, 0);
            ctx.filter = 'none';
          } else {
            const img1 = loadedImages[0];
            const img2 = loadedImages[1];
            
            const targetHeight = Math.max(img1.height, img2.height);
            const ratio1 = targetHeight / img1.height;
            const ratio2 = targetHeight / img2.height;
            
            canvas.width = (img1.width * ratio1) + (img2.width * ratio2);
            canvas.height = targetHeight;
            
            ctx.filter = filterStack;
            ctx.drawImage(img1, 0, 0, img1.width * ratio1, targetHeight);
            ctx.drawImage(img2, img1.width * ratio1, 0, img2.width * ratio2, targetHeight);
            ctx.filter = 'none';
          }
        }

        // Output kualitas tinggi tanpa watermark
        resolve(canvas.toDataURL('image/jpeg', 0.98));
      } catch (err) {
        reject(err);
      }
    };

    process();
  });
};
