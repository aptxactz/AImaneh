
import { GoogleGenAI } from "@google/genai";

export interface ImageInput {
  base64: string;
  mimeType: string;
}

/**
 * Generates or edits an image using Gemini AI.
 * Always creates a fresh instance of GoogleGenAI to ensure the latest API key is used.
 */
export const generateStudioImage = async (
  images: ImageInput[],
  prompt: string,
  mode: 'SINGLE' | 'COUPLE'
): Promise<string> => {
  // Always create a new instance right before the call to ensure up-to-date API key usage.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Using gemini-2.5-flash-image for standard high-quality generation.
  const modelName = 'gemini-2.5-flash-image';

  const parts: any[] = [];

  // Add reference images if provided
  images.forEach((img) => {
    // Extract base64 data correctly (strip the MIME prefix if it exists)
    const base64Data = img.base64.includes(',') ? img.base64.split(',')[1] : img.base64;
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: img.mimeType,
      },
    });
  });

  // System instruction for professional studio quality
  const qualityDirectives = `
    - Hyper-realistic facial accuracy and professional studio lighting.
    - Sharp textures, cinematic depth, and high anatomical detail.
    - If reference photos are provided, maintain strong facial resemblance.
    - Output should be a masterpiece of professional photography.
  `.trim();

  const systemContext = images.length > 0 
    ? `TASK: Pro Facial Editing. INSTRUCTION: ${prompt}. \n\nQUALITY RULES: ${qualityDirectives}`
    : `TASK: Pro Photo Generation. DESCRIPTION: ${prompt}. \n\nQUALITY RULES: ${qualityDirectives}`;

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
    
    // Iterating through parts to find the image part (inlineData) as required by guidelines.
    // Do not assume the first part is the image.
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          generatedBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!generatedBase64) {
      throw new Error("AI did not return an image part. Please try a different prompt or check your API key.");
    }

    return generatedBase64;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Propagate the error for UI feedback
    throw error;
  }
};
