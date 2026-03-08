# 🎓 CodeGurukul
**The Ultimate Educational Ecosystem & Secure Coding Environment**

CodeGurukul is a comprehensive educational platform combining an advanced **Web Portal** for Admins and Teachers with a tightly-secured **Desktop Application** for Students. It offers real-time monitoring, AI-assisted grading, and local sandboxed compilation.

---

## 🏗️ Architecture & Stack
CodeGurukul is composed of three interconnected systems:

1. **Backend Server (`/backend`)**
   - Node.js, Express, Sequelize (PostgreSQL), Mongoose (MongoDB)
   - Socket.IO for real-time live monitoring and streaming compiler outputs
   - Connects to Google Gemini API for Automated AI Code Grading and the Gemini Guru Chatbot

2. **Web Portal (`/frontend`)**
   - React, Vite, Tailwind CSS (v4), React Query
   - Provides full dashboards for Admins (manage users/classes) and Teachers (track progress, create assignments, view live monitors)

3. **Secure Student Desktop App (`/windows-app`)**
   - Electron, React, Vite, Monaco Editor
   - Kiosk-mode lockdown application preventing Alt+Tab/Task Manager
   - Built-in IDE interface with multi-language compiler integration and integrated AI chat

---

## 🛠️ Prerequisites

- **PostgreSQL**: Must be running locally (Port 5432)
- **MongoDB**: Must be running locally (Port 27017)
- **Node.js**: v18+ Recommended
- **Compilers**: Run the included `install_compilers.bat` to automatically install Node, Python, Java, and GCC (via MSYS2) if you want to run code execution locally.

---

## 🚀 Quick Start Guide

### 1. Database & Environment Setup
Ensure PostgreSQL and MongoDB services are running on your machine.
In `/backend/.env`, set your database credentials along with your `GEMINI_API_KEY_1` API key.

### 2. Start the Backend Server
From the root folder, run the automated start script to boot the tunneling and server:
```bash
server_start.bat
```
This automatically establishes an Ngrok tunnel (for Socket.io) and boots the Node.js backend on Port 5000.

### 3. Start the Web Portal (Admin/Teacher)
In a new terminal:
```bash
cd frontend
npm run dev
```
Navigate to `http://localhost:5173`. 
*Default Admin:* `admin@codegurukul.com` / `admin123`

### 4. Start the Secure Student App
In a new terminal:
```bash
cd windows-app
npm run dev
```
To compile an executable installer for the school machines, run: `npm run build`

---

## 🔒 The Secure Compilation Engine

The backend securely executes student code by writing to a temporary sandbox directory.
It utilizes native `child_process.spawn` to hook into locally installed compilers, passing `stdin` and streaming `stdout` via WebSockets directly to the Electron App.

Supported Languages:
- **Javascript** (Node)
- **Python** (python)
- **Java** (javac & java)
- **C** (gcc)
- **C++** (g++)

---

## 🤖 AI Features (Gemini Integration)
CodeGurukul harnesses the power of Google's Gemini models for dual purposes:
1. **Automated Grading:** Compares student code against the assignment problem statement, identifies bugs, and assigns a grade out of 10.
2. **Gemini Guru (Chatbot):** Context-aware tutoring available via `Ctrl+G`. Passing the currently highlighted code implicitly allows the Guru to guide the student without revealing direct answers.
