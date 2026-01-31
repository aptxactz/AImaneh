
export interface ImageInput {
  base64: string;
  mimeType: string;
}

const parseInstructionsToFilters = (prompt: string): string => {
  const p = prompt.toLowerCase();
  let filters = "contrast(1.1) saturate(1.1)"; 

  // Deteksi Filter Populer (Multibahasa)
  if (/hitam|putih|black|white|monochrome|bw|abu/.test(p)) {
    filters += " grayscale(1) contrast(1.2)";
  }
  if (/vintage|jadul|klasik|classic|retro|sepia|old/.test(p)) {
    filters += " sepia(0.8) contrast(0.9) brightness(1.1)";
  }
  if (/cerah|terang|bright|light|siang/.test(p)) {
    filters += " brightness(1.3) contrast(1.1)";
  }
  if (/gelap|dark|malam|night|dramatis/.test(p)) {
    filters += " brightness(0.7) contrast(1.4) saturate(0.9)";
  }
  if (/tajam|vibrant|sharp|color|pop|kontras/.test(p)) {
    filters += " saturate(2) contrast(1.3) brightness(1.1)";
  }
  if (/soft|lembut|blur|dreamy|halus/.test(p)) {
    filters += " blur(1px) brightness(1.05) saturate(1.1)";
  }
  if (/dingin|cool|biru|blue|ocean/.test(p)) {
    filters += " hue-rotate(180deg) saturate(1.1)";
  }
  if (/hangat|warm|sunset|gold|kuning/.test(p)) {
    filters += " sepia(0.4) saturate(1.6) brightness(1.05)";
  }

  return filters;
};

export const processLocalImage = async (
  images: ImageInput[],
  mode: 'SINGLE' | 'COUPLE',
  prompt: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error("Canvas context failed"));
      return;
    }

    const loadImg = (src: string): Promise<HTMLImageElement> => {
      return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    };

    const run = async () => {
      try {
        if (images.length === 0) {
          // Generate background if no photo
          canvas.width = 1000;
          canvas.height = 1000;
          ctx.fillStyle = "#0f172a";
          ctx.fillRect(0, 0, 1000, 1000);
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(500, 500, 400, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.font = "bold 40px Inter";
          ctx.textAlign = "center";
          ctx.fillText("AI MANEH STUDIO", 500, 500);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
          return;
        }

        const loaded = await Promise.all(images.map(i => loadImg(i.base64)));
        const filterStr = parseInstructionsToFilters(prompt);

        if (mode === 'SINGLE' || loaded.length === 1) {
          const img = loaded[0];
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.filter = filterStr;
          ctx.drawImage(img, 0, 0);
        } else {
          // Side by side for couple
          const img1 = loaded[0];
          const img2 = loaded[1];
          canvas.width = img1.width + img2.width;
          canvas.height = Math.max(img1.height, img2.height);
          ctx.filter = filterStr;
          ctx.drawImage(img1, 0, 0);
          ctx.drawImage(img2, img1.width, 0);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.98));
      } catch (e) {
        reject(e);
      }
    };

    run();
  });
};
