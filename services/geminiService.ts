
import { GoogleGenAI } from "@google/genai";

export interface ImageInput {
  base64: string;
  mimeType: string;
}

/**
 * Generates or edits an image using Gemini AI.
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

  const ai = new GoogleGenAI({ apiKey });
  const modelName = 'gemini-2.5-flash-image';

  const parts: any[] = [];

  images.forEach((img) => {
    const base64Data = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: img.mimeType,
      },
    });
  });

  // Instruksi sistem yang sangat spesifik untuk detail wajah (High Fidelity)
  const qualityDirectives = `
    - EXTREME FACIAL DETAIL: Focus on hyper-realistic eyes, skin pores, fine facial hair, and realistic lip textures.
    - ANATOMICAL ACCURACY: Ensure precise bone structure and realistic human proportions.
    - STUDIO LIGHTING: Use cinematic lighting with professional bokeh and sharp focus.
    - HIGH FIDELITY: Maintain 1:1 facial likeness if a reference image is provided.
    - STYLE: Masterpiece, 8k, professional photography, high dynamic range.
  `.trim();

  const systemContext = images.length > 0 
    ? `TASK: High-Fidelity Facial Editing. INSTRUCTION: ${prompt}. \n\nQUALITY RULES: ${qualityDirectives}`
    : `TASK: Photo-Realistic Human Generation. DESCRIPTION: ${prompt}. \n\nQUALITY RULES: ${qualityDirectives}`;

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
    console.error("Gemini API Error Detail:", error);
    throw error;
  }
};
