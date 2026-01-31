
export interface ImageInput {
  base64: string;
  mimeType: string;
}

export const processLocalImage = async (
  images: ImageInput[],
  mode: 'SINGLE' | 'COUPLE'
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
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
      });
    };

    const process = async () => {
      try {
        const loadedImages = await Promise.all(images.map(img => loadImg(img.base64)));
        
        if (mode === 'SINGLE') {
          const img = loadedImages[0];
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Auto-Enhance Filters
          ctx.filter = 'contrast(1.05) saturate(1.1) brightness(1.02) sharpness(1.1)';
          ctx.drawImage(img, 0, 0);
          ctx.filter = 'none';
        } else {
          // Couple Mode: Side-by-Side Composition
          const img1 = loadedImages[0];
          const img2 = loadedImages[1] || loadedImages[0];
          
          const targetHeight = Math.max(img1.height, img2.height);
          const ratio1 = targetHeight / img1.height;
          const ratio2 = targetHeight / img2.height;
          
          canvas.width = (img1.width * ratio1) + (img2.width * ratio2);
          canvas.height = targetHeight;
          
          ctx.drawImage(img1, 0, 0, img1.width * ratio1, targetHeight);
          ctx.drawImage(img2, img1.width * ratio1, 0, img2.width * ratio2, targetHeight);
        }

        // Apply Professional Watermark
        const padding = canvas.width * 0.03;
        const fontSize = Math.max(24, canvas.width * 0.025);
        
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = `italic bold ${fontSize}px Inter`;
        ctx.textAlign = "right";
        
        const watermarkText = "AImaneh Studio Pro";
        ctx.fillText(watermarkText, canvas.width - padding, canvas.height - padding);
        
        // Export high quality
        resolve(canvas.toDataURL('image/jpeg', 0.95));
      } catch (err) {
        reject(err);
      }
    };

    process();
  });
};
