
import { GoogleGenAI } from "@google/genai";

export interface ImageInput {
  base64: string;
  mimeType: string;
}

/**
 * Menghasilkan atau mengedit gambar menggunakan Gemini AI.
 * Inisialisasi dilakukan di dalam fungsi untuk memastikan pengambilan API_KEY terbaru.
 */
export const generateStudioImage = async (
  images: ImageInput[],
  prompt: string,
  mode: 'SINGLE' | 'COUPLE'
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  // Selalu buat instance baru untuk memastikan mendapatkan konteks env terbaru
  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-2.5-flash-image';

  const parts: any[] = [];

  images.forEach((img) => {
    // Bersihkan prefix base64 jika ada
    const base64Data = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: img.mimeType,
      },
    });
  });

  // Instruksi sistem yang diperkuat untuk akurasi wajah dan estetika studio
  const qualityDirectives = `
    - ULTRA HIGH FIDELITY: Maintain 1:1 facial likeness of the subjects provided.
    - FACIAL ACCURACY: Realistic eyes, detailed skin textures, and natural shadows.
    - STUDIO LIGHTING: Cinematic lighting, professional photography style, sharp focus.
    - MASTERPIECE: 8k resolution feel, high dynamic range, clean composition.
    - If no image is provided, generate from scratch based on: ${prompt}.
  `.trim();

  const systemContext = images.length > 0 
    ? `TASK: High-End Portrait Editing. INSTRUCTION: ${prompt}. \n\nQUALITY RULES: ${qualityDirectives}`
    : `TASK: Professional Image Generation. DESCRIPTION: ${prompt}. \n\nQUALITY RULES: ${qualityDirectives}`;

  parts.push({ text: systemContext });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    let generatedBase64 = "";
    
    // Iterasi part untuk menemukan data gambar sesuai regulasi
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedBase64) {
      throw new Error("NO_IMAGE_RETURNED");
    }

    return generatedBase64;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
