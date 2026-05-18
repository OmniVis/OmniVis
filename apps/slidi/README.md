# 🚀 Slidi

> AI-powered interactive presentations — not slides, but real web apps.

Slidi is a next-generation presentation tool that generates **fully interactive web-based presentations** using AI. Instead of static slides like PowerPoint or Google Slides, Slidi creates **live React/HTML apps** that users can present, share, and interact with in real-time.

---

## ✨ Features

- 🧠 **AI-Powered Creation**
  - Generate presentations using natural language prompts

- 🔑 **Bring Your Own Key (BYOK)**
  - Use your own OpenAI, Anthropic, or Gemini API key
  - No server-side AI costs

- 🖥️ **Live Canvas Preview**
  - Real-time rendering using Sandpack (CodeSandbox)
  - See changes instantly as AI updates code

- 💬 **Dual-Pane Interface**
  - Chat with AI on the left
  - Live presentation on the right

- 🧩 **Interactive Slides**
  - Charts, animations, calculators, mini-games
  - Built with React, not static images

- 🔗 **Instant Sharing**
  - Publish presentations via URL
  - View in full-screen presentation mode

- 🛠️ **Code View (Advanced Users)**
  - Edit generated React/HTML code manually

- 🍴 **Forking**
  - Clone and modify shared presentations

- ⏪ **Version Control**
  - Undo/Redo AI changes

---

## 🏗️ Tech Stack

- **Frontend:** Next.js (React, App Router)
- **Styling:** Tailwind CSS + shadcn/ui
- **Live Code Execution:** Sandpack (CodeSandbox)
- **State Management:** Zustand / React Context
- **Database:** Supabase or Firebase
- **AI Providers:** OpenAI, Anthropic, Google Gemini

---

## 📦 Project Structure

```text
slidi/
├── plan/                       # Planning & architecture (not for production)
│   ├── product_vision.md
│   ├── style_template.tsx
│   └── instructions.md
├── src/
│   ├── app/                   # Next.js routes
│   ├── components/            # UI components
│   ├── lib/                   # Utilities (AI prompts, API logic)
│   └── store/                 # Global state
├── package.json
└── tailwind.config.ts