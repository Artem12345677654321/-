import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

// Lazy initialization singleton pattern
let aiClient: GoogleGenAI | null = null;

const getAiClient = (): GoogleGenAI => {
  if (!aiClient) {
    // Safely check for process.env to avoid ReferenceError in browsers
    const apiKey = (typeof process !== 'undefined' && process.env && process.env.API_KEY) 
      ? process.env.API_KEY 
      : '';
      
    // Note: If apiKey is empty, calls will fail, but the app won't crash on startup.
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
};

// --- Text & Search Generation ---

export const generateGroundedContent = async (prompt: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    // Extract sources if available
    const sources = groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title,
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri) || [];

    return { text, sources };
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

export const generateCreativeText = async (prompt: string) => {
  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Using Pro for complex creative tasks
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2048 }, // Enable thinking for better reasoning
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Creative Error:", error);
    throw error;
  }
};

// --- Live API Helpers ---

// Helper to convert Float32Array to PCM Blob (16-bit, 16kHz)
export function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // Clamp values to [-1, 1] range before scaling
    const s = Math.max(-1, Math.min(1, data[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  
  // Custom encode function instead of external lib
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Helper to decode Base64 to ArrayBuffer
export function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const connectLiveSession = async (
  callbacks: {
    onOpen: () => void;
    onMessage: (message: LiveServerMessage) => void;
    onClose: () => void;
    onError: (e: ErrorEvent) => void;
  }
) => {
  const ai = getAiClient();
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks: {
      onopen: callbacks.onOpen,
      onmessage: callbacks.onMessage,
      onclose: (e) => callbacks.onClose(),
      onerror: callbacks.onError,
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: "You are Omni, a highly intelligent, futuristic AI assistant. You speak concisely and with a slightly futuristic, helpful tone.",
    },
  });
};