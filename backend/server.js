import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" })); // Allow frontend communication

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// Define User Schema
const UserSchema = new mongoose.Schema({
  name: String,
  age: Number,
  topic: String,
  timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);

// Store debate sessions in memory
let debateSessions = {};

// Function to generate AI debate response
async function runDebate(userName, userArgument) {
    const userData = debateSessions[userName];
    if (!userData) {
        throw new Error("User not found. Please start the debate first.");
    }

    const { age, topic, conversation } = userData;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `You are debating with ${userName}, a ${age}-year-old, on '${topic}'.  
    Respond concisely with logic, wit, sarcasm sometimes, humor, and a competitive tone. 
    Avoid phrases like "Well," at the beginning and mimic human speech. Add emojis in short responses if needed.
    
    Conversation so far:
    ${conversation}
    
    User: ${userArgument}
    DebatoxAI (respond concisely, sarcastically with a counterargument, or a witty remark): `;

    try {
        const result = await model.generateContent(prompt);
        const aiResponse = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 
            "I'm having trouble responding. Please try again.";

        debateSessions[userName].conversation += `\n${userName}: ${userArgument}\nAI: ${aiResponse}`;

        return aiResponse;
    } catch (error) {
        console.error("Error generating debate response:", error);
        return "I'm having trouble responding. Please try again.";
    }
}

// **1️⃣ Start Debate Endpoint (Stores User Info)**
app.post("/start-debate", async (req, res) => {
    const { name, age, topic } = req.body;

    if (!name || !age || !topic) {
        return res.status(400).json({ error: "Name, age, and topic are required to start the debate." });
    }

    try {
        // Store user info in MongoDB
        const newUser = new User({ name, age, topic });
        await newUser.save();
        console.log("Saving User:", { name, age, topic });

        console.log("User Saved!");


        debateSessions[name] = { age, topic, conversation: "" };

        res.json({ 
            message: `Welcome ${name}! I am DebaTox. Think you can outsmart me? Let's see if you can keep up! 
            Start with your first argument on '${topic}'.`
        });
    } catch (error) {
        console.error("Error saving user to database:", error);
        res.status(500).json({ error: "Failed to start the debate." });
    }
});

// **2️⃣ Debate Response Endpoint**
app.post("/debate", async (req, res) => {
    const { name, userArgument } = req.body;

    if (!name || !userArgument) {
        return res.status(400).json({ error: "Name and userArgument are required." });
    }

    try {
        const aiResponse = await runDebate(name, userArgument);
        res.json({ aiResponse });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// **3️⃣ End Debate Endpoint**
app.post("/end-debate", (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Name is required to end the debate." });
    }

    delete debateSessions[name];
    res.json({ message: "Debate ended and history cleared." });
});

// **4️⃣ Text-to-Speech Endpoint**
app.post("/speak", async (req, res) => {
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ error: "Text is required for speech synthesis." });
    }

    try {
        res.json({ speechText: text });
    } catch (error) {
        console.error("Error in text-to-speech:", error);
        res.status(500).json({ error: "Failed to generate speech." });
    }
});

// Start the Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
