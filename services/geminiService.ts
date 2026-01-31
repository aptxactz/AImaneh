
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAIClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

export const processImage = async (
  prompt: string,
  images: Array<{ base64: string; mimeType: string }>
): Promise<string> => {
  const ai = getAIClient();
  const modelName = 'gemini-2.5-flash-image';

  try {
    const parts: any[] = [];
    
    // Tambahkan semua gambar yang diunggah ke dalam parts
    images.forEach((img, index) => {
      parts.push({
        inlineData: {
          data: img.base64.split(',')[1],
          mimeType: img.mimeType,
        },
      });
    });

    // Instruksi teknis resolusi tinggi
    const highResEnhancer = "\n\nTECHNICAL SPECS: Ultra-high resolution, 8k UHD, extremely detailed textures, sharp focus, professional studio lighting, masterpiece quality, photorealistic, noise-free.";
    
    // Instruksi khusus jika ada 2 gambar (Fitur Couple)
    let specializedInstruction = "";
    if (images.length === 2) {
      specializedInstruction = `\n\nCOUPLE SYNTHESIS MODE: Create a single, cohesive photo featuring both individuals from the provided images together. 
      Maintain 100% accurate facial likeness for BOTH Person 1 and Person 2. 
      They should be positioned as a couple in a natural, professional, or romantic composition as requested: ${prompt}. 
      Ensure consistent lighting and skin tones across both individuals.`;
    } else if (images.length === 1) {
      specializedInstruction = `\n\nFACE PRESERVATION: Maintain the EXACT facial identity of the person in the source image. Apply requested changes: ${prompt}.`;
    }

    const finalPrompt = `${prompt}${specializedInstruction}${highResEnhancer}`;
    parts.push({ text: finalPrompt });

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("Tidak ada respon dari AI");

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("Gambar tidak berhasil dibuat. Coba gunakan deskripsi yang lebih spesifik.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
