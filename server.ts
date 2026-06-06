import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Full-stack API for Gemini Virtual Banking Assistant
app.post("/api/support/chat", async (req, res) => {
  try {
    const { message, userProfile, chatHistory } = req.body;

    const ai = getAiClient();

    // Prepare contextual system prompt with real user account and card information
    let contextPrompt = "You are Unitycore Autonomous Banking AI, a secure elite personal financial representative. ";
    contextPrompt += "Respond with a polished, highly professional, secure tone. Emphasize safety and quick response. ";
    
    if (userProfile) {
      contextPrompt += `\n\nClient Context:
- Name: ${userProfile.name}
- Email: ${userProfile.email}
- Account Username: @${userProfile.username}
`;
      if (userProfile.accounts && Array.isArray(userProfile.accounts)) {
        contextPrompt += "\nClient Accounts:\n";
        userProfile.accounts.forEach((a: any) => {
          contextPrompt += `- ${a.name} (${a.type}): Balance of $${a.balance.toFixed(2)} (Last 4: ${a.lastFour})\n`;
        });
      }
      if (userProfile.cards && Array.isArray(userProfile.cards)) {
        contextPrompt += "\nClient Cards:\n";
        userProfile.cards.forEach((c: any) => {
          contextPrompt += `- Card ending ${c.cardNumber.slice(-4)}: Limit $${c.limit}, Balance $${c.balanceOutline}, State: ${c.isFrozen ? "FROZEN" : "ACTIVE"}\n`;
        });
      }
      if (userProfile.transactions && Array.isArray(userProfile.transactions)) {
        contextPrompt += "\nRecent Activity/Transactions:\n";
        userProfile.transactions.slice(0, 5).forEach((tx: any) => {
          contextPrompt += `- [${tx.date}] ${tx.description}: $${tx.amount.toFixed(2)} (${tx.category})\n`;
        });
      }
    }

    contextPrompt += "\n\nGeneral instructions:";
    contextPrompt += "\n- Help users calculate compound interest values, provide saving tips, or check on support tickets.";
    contextPrompt += "\n- If the user asks about a dispute, guide them to use our dedicated transaction dispute form inside the dispute panel.";
    contextPrompt += "\n- Keep responses concise, clear, and professional. Avoid markdown list nesting if possible. Do not invent details not in the context.";

    // Assemble messages for chat
    const contents = [];
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((item: any) => {
        contents.push({
          role: item.sender === "user" ? "user" : "model",
          parts: [{ text: item.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: contextPrompt,
        temperature: 0.7,
      }
    });

    res.json({
      success: true,
      sender: "bot",
      text: response.text || "Thank you for message, let me check that for you.",
      timestamp: "Just Now"
    });
  } catch (error) {
    console.error("Gemini chatbot error:", error);
    res.status(500).json({
      success: false,
      text: "I apologize, our secure intelligence node is currently performing ledger reconciliation. Please try again shortly or use direct bypass shortcuts."
    });
  }
});

// Configure Vite or Static Files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode with static delivery...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Unitycore core server executing successfully on port ${PORT}`);
  });
}

if (!process.env.VERCEL) {
  setupServer();
}

export default app;
