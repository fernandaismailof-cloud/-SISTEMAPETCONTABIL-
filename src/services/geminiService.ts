import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error("GEMINI_API_KEY não configurada. Adicione-a nas variáveis de ambiente do seu projeto.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export interface TransactionData {
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

export const processAIInput = async (
  input: string | { mimeType: string; data: string }
): Promise<TransactionData | null> => {
  try {
    const ai = getAI();
    const model = "gemini-3-flash-preview";
  
    const systemInstruction = `
      Você é um assistente contábil veterano especializado em clínicas veterinárias (Pet Contábil).
      Sua tarefa é extrair dados financeiros de mensagens de texto, áudio ou fotos de recibos.
      Retorne sempre um objeto JSON válido seguindo o esquema.
      Se o tipo não for óbvio, use 'expense' como padrão.
      Extraia o valor, a categoria (ex: Medicamentos, Salários, Aluguel, Consultas, Banho e Tosa), a descrição e a data (formato ISO YYYY-MM-DD).
      Se não houver data, use o dia de hoje.
    `;

    const contents = typeof input === 'string' 
      ? input 
      : {
          parts: [
            { text: "Extraia os dados desta imagem/áudio de transação financeira veterinária." },
            { inlineData: input }
          ]
        };

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["income", "expense"] },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            description: { type: Type.STRING },
            date: { type: Type.STRING }
          },
          required: ["type", "amount", "category", "description", "date"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as TransactionData;
    }
  } catch (error) {
    console.error("Gemini Error:", error);
  }
  
  return null;
};
