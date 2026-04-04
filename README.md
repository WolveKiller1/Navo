# Rylingo MVP

**AI-Powered, Pattern-Based Language Learning Web App**

Rylingo is a minimal, working web prototype where users can have a short "call" with an AI that listens, responds, and gently corrects their language usage.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Modern browser (Chrome or Edge recommended for best speech recognition support)
- Claude API key from [Anthropic](https://console.anthropic.com/)

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```
   
   Then edit `.env` and add your Claude API key:
   ```
   VITE_CLAUDE_API_KEY=your_actual_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:5173` (or the URL shown in your terminal)

---

## 🎯 How to Use

1. **Press and hold** the large blue microphone button
2. **Speak** in the language you're learning
3. **Release** the button when done speaking
4. The AI (Rylingo) will:
   - Transcribe what you said (shown in blue subtitle)
   - Generate a natural, conversational response with gentle corrections
   - Speak the response aloud (shown in orange subtitle)
5. **Continue** the conversation by pressing the mic button again
6. **End Call** when you're finished

---

## 🛠️ Tech Stack

- **Frontend Framework**: React 18 + Vite
- **AI Model**: Claude API (Sonnet 4.5)
- **Speech-to-Text**: Browser-native Web Speech API (`SpeechRecognition`)
- **Text-to-Speech**: Browser-native Web Speech API (`SpeechSynthesis`)
- **HTTP Client**: Axios
- **Icons**: React Icons

---

## 📁 Project Structure

```
rylingo-mvp/
├── src/
│   ├── components/
│   │   └── CallScreen.jsx      # Main UI component
│   ├── services/
│   │   ├── conversation.js     # Claude API integration
│   │   └── tts.js              # Text-to-speech service
│   ├── styles/
│   │   └── CallScreen.css      # Component styling
│   ├── App.jsx                 # Root component
│   ├── App.css                 # Global styles
│   └── main.jsx                # Entry point
├── .env                        # Your API key (gitignored)
├── .env.example                # Template for environment variables
├── package.json                # Dependencies
└── vite.config.js              # Vite configuration
```

---

## 🔧 Configuration

### Claude API Settings

Located in `src/services/conversation.js`:

- **Model**: `claude-sonnet-4-20250514` (Sonnet 4.5)
- **Max Tokens**: `150` (adjustable between 120-180 for testing)
- **Temperature**: `0.7` (conversational)
- **Context Limit**: ~1,000 tokens per request (for fast responses)

### Speech Settings

Located in `src/services/tts.js`:

- **Speech Rate**: `0.9` (slightly slower for clarity)
- **Pitch**: `1.0`
- **Volume**: `1.0`

---

## ⚠️ Security Notice

**IMPORTANT:** In this MVP phase, the Claude API key is exposed client-side in the browser. This is acceptable for local development and testing, but **should never be used in production**.

### For Production Deployment:

1. **Move API calls to a backend server**
   - Create a Node.js/Express backend
   - Store the API key as a server-side environment variable
   - Make requests from the frontend to your backend, which then calls Claude API

2. **Example backend proxy pattern**:
   ```
   Frontend → Your Backend API → Claude API
   ```

3. **Add rate limiting and authentication** to prevent API key abuse

---

## 🌐 Browser Compatibility

| Feature | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| SpeechRecognition | ✅ | ✅ | ⚠️ Partial | ❌ Limited |
| SpeechSynthesis | ✅ | ✅ | ✅ | ✅ |

**Recommended**: Chrome or Edge for full functionality

---

## 🎨 Features

✅ **Real-time Speech-to-Text**: Browser-native speech recognition  
✅ **AI Conversation**: Natural language processing with Claude  
✅ **Text-to-Speech**: AI responses spoken aloud  
✅ **Gentle Corrections**: Uses recasting technique (repeats correctly rather than pointing out errors)  
✅ **Conversation Memory**: Maintains context throughout the session (~1,000 tokens)  
✅ **Clean UI**: Minimal, calm design with off-white/light blue theme  
✅ **Session Management**: Start/end calls with conversation reset  
✅ **Responsive Design**: Works on desktop and mobile devices  

---

## 🐛 Troubleshooting

### "Your browser doesn't support speech recognition"
- Use Chrome or Edge browser
- Ensure you're on HTTPS (or localhost for development)

### "I'm having trouble connecting. Please check your API key"
- Verify your API key in `.env` file
- Ensure the key starts with `sk-ant-`
- Check your Anthropic account has available credits

### Microphone not working
- Grant microphone permissions when prompted
- Check browser settings for microphone access
- Ensure no other app is using the microphone

### No audio from AI responses
- Check your system volume
- Ensure browser has permission to play audio
- Try clicking the page first (some browsers require user interaction)

---

## 📝 Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🚧 Future Enhancements

- [ ] Backend API proxy for secure API key handling
- [ ] User authentication and progress tracking
- [ ] Multiple language support
- [ ] Voice selection for TTS
- [ ] Conversation history and analytics
- [ ] Spaced repetition learning patterns
- [ ] Mobile app (React Native)

---

## 📄 License

This is an MVP project. Add your license here.

---

## 🙏 Acknowledgments

- **Claude API** by Anthropic
- **React** by Meta
- **Vite** by Evan You
- **Web Speech API** by W3C

---

**Built with ❤️ for language learners worldwide**
