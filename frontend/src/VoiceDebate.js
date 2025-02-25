import React, { useState } from "react";
import axios from "axios";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { useSpeechSynthesis } from "react-speech-kit";
import { motion } from "framer-motion";
import "./VoiceDebate.css";

const removeEmojis = (text) => text.replace(/\p{Emoji}/gu, "");

const VoiceDebate = () => {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [topic, setTopic] = useState("");
  const [textInput, setTextInput] = useState("");
  const [conversation, setConversation] = useState([]);
  const [debateStarted, setDebateStarted] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  const { transcript, listening, resetTranscript } = useSpeechRecognition();
  const { speak } = useSpeechSynthesis();

  if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
    return <p>Your browser does not support speech recognition.</p>;
  }

  // Function to handle AI speech animation & voice
  const speakAIResponse = (responseText) => {
    setAiSpeaking(true); // Start animation when AI starts speaking
    const utterance = new SpeechSynthesisUtterance(responseText);

    utterance.onend = () => {
      setAiSpeaking(false); // Stop animation when AI finishes speaking
    };

    speechSynthesis.speak(utterance);
  };

  // Start the debate
  const handleStartDebate = async () => {
    if (!name || !age || !topic) {
      alert("Please enter name, age, and debate topic.");
      return;
    }

    try {
      const response = await axios.post("http://localhost:5000/start-debate", { name, age, topic });
      setDebateStarted(true);
      setConversation([{ sender: "Debatox", text: response.data.message }]);
      speakAIResponse(removeEmojis(response.data.message));
    } catch (error) {
      console.error("Error starting debate:", error);
    }
  };

  // Send user input and get AI response
  const handleSend = async () => {
    const userStatement = textInput.trim() || transcript.trim();
    if (!userStatement) return;

    setConversation((prev) => [...prev, { sender: "User", text: userStatement }]);
    setTextInput("");
    resetTranscript();

    try {
      const response = await axios.post("http://localhost:5000/debate", { name, userArgument: userStatement });
      const aiResponse = response.data.aiResponse;

      setConversation((prev) => [...prev, { sender: "Debatox", text: aiResponse }]);
      speakAIResponse(removeEmojis(aiResponse)); // Trigger AI speech with animation
    } catch (error) {
      console.error("Error in debate:", error);
    }
  };

  // End debate
  const handleEndDebate = async () => {
    try {
      await axios.post("http://localhost:5000/end-debate", { name });
      setDebateStarted(false);
      setConversation([{ sender: "System", text: "Debate ended." }]);
      setName("");
      setAge("");
      setTopic("");
      setTextInput("");
    } catch (error) {
      console.error("Error ending debate:", error);
    }
  };

  return (
    <div className="debate-container">
      {!debateStarted ? (
        <div className="start-form">
          <input type="text" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
          <input type="number" placeholder="Enter your age" value={age} onChange={(e) => setAge(e.target.value)} />
          <input type="text" placeholder="Enter debate topic" value={topic} onChange={(e) => setTopic(e.target.value)} /> <br></br><br></br>
          <button onClick={handleStartDebate}>Start Debate</button>
        </div>
      ) : (
        <>
          {/* AI Sphere Animation */}
          <motion.div 
  className={`ai-sphere ${aiSpeaking ? 'glowing' : ''}`}
  animate={aiSpeaking ? {
    scale: [1, 1.3, 1],   
    boxShadow: ["0px 0px 20px rgba(138, 43, 226, 0.8)", "0px 0px 40px rgb(194, 141, 243)", "0px 0px 20px rgba(138, 43, 226, 0.8)"]
  } : {
    scale: 1, 
    boxShadow: "0px 0px 20px rgba(138, 43, 226, 0.8)"
  }}
  transition={aiSpeaking ? {
    duration: 0.5,
    repeat: Infinity,
    ease: "easeInOut",
  } : {
    duration: 0.1 // Smooth transition back to normal
  }}
/>


          {/* Chat Box */}
          <div className="chat-box " >
            {conversation.map((msg, index) => (
              <p key={index} className={msg.sender.toLowerCase()}>
                <strong>{msg.sender}:</strong> {msg.text}
              </p>
            ))}
          </div>

          {/* Chat Input with Buttons */}
          <div className="input-container">
            <input
              type="text"
              placeholder="Type your argument..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSend();
                }
              }}
            />
            <button 
              className="speech-btn" 
              onClick={() => {
                SpeechRecognition.startListening();
              }} 
              disabled={listening}
            >🎤</button>
            <button 
              onClick={handleSend} 
              disabled={!textInput.trim() && !transcript.trim()}
            >📤</button>
            <button onClick={handleEndDebate}>🚫</button>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceDebate;
