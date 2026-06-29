# ⚡ Cerebras Nexus

[![Powered by Cerebras](https://img.shields.io/badge/Powered%20by-Cerebras-FF4F00?style=for-the-badge&logo=cerebras )](https://cerebras.net/ )
[![Powered by Gemma4](https://img.shields.io/badge/Model-Gemma4-blue?style=for-the-badge )](https://ai.google.dev/gemma )
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript )](https://www.typescriptlang.org/ )
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react )](https://react.dev/ )

> **A multi-agent AI platform that transforms natural language infrastructure requirements into production-ready code, architecture diagrams, and compliance audits.**

## 🚀 Powered by Cerebras & Gemma4: The Need for Speed

**Cerebras Nexus** is built on a fundamental premise: complex infrastructure design requires multiple specialized AI agents working in sequence. This project utilizes an **8-Agent Sequential Pipeline** (Analyze → Design → Code → Compliance → Auto-Heal → Hardener → Docs → Validator). 

Running 8 sequential LLM calls for a single user request would traditionally result in an impossibly slow and frustrating User Experience. **This project is made possible exclusively by the ultra-fast inference capabilities of Cerebras hardware paired with the Gemma4 model.** Without Cerebras' unprecedented token generation speed, real-time streaming of this massive multi-agent chain-of-thought would simply not be viable.

## 📖 Description

Cerebras Nexus — Mission Control solves the problem of manual, fragmented cloud infrastructure design. It automates the entire lifecycle—from initial analysis and architectural design to code generation, security hardening, and documentation. By simply describing your infrastructure needs in natural language, the platform orchestrates its AI agents to deliver Terraform/HCL code, GDPR/ISO/SOC2 compliance audits, CIS Benchmark hardening, and professional validation reports in seconds.

## ✨ Key Features

- **Natural Language to Infrastructure**: Converts plain text requirements into production-ready Terraform, HCL, CloudFormation, or Pulumi code.
- **8-Agent AI Pipeline**: A sequential workflow featuring specialized agents: *Analyze, Design, Code, Compliance, Auto-Heal, Hardener, Docs, and Validator*.
- **Automated Compliance Audits**: Built-in checks for GDPR (Art. 5, 17, 25, 32), ISO 27001 (Annex A), and SOC 2.
- **CIS Benchmark Hardening**: Automatic security hardening based on CIS AWS Foundations Benchmark v3.0.0 (Level 1 & 2).
- **Self-Healing Architecture**: Features a 20-failure-mode catalog with automatic patching and chain-of-thought remediation.
- **Interactive Architecture Diagrams**: Renders Mermaid.js diagrams with zoom/pan capabilities and SVG/PNG export.
- **Visual Code Diff**: Side-by-side, color-coded comparisons of infrastructure code before and after AI remediation.
- **Multimodal File Processing**: Upload and process requirements via PDF, DOCX, DOC, text files, or images.
- **Real-Time Streaming UI**: Features Server-Sent Events (SSE) token streaming and progress rings for each agent in a sleek, dark "Mission Control" interface.
- **Professional PDF Export**: Generate comprehensive reports complete with cover pages, sections, badges, and certifications.

## 🛠️ Tech Stack

This project is structured as a Monorepo using npm workspaces (`client`, `server`, `shared`).

| Layer | Technology |
| :--- | :--- |
| **Language** | TypeScript 5.8 |
| **Frontend** | React 19, Vite 6, Tailwind CSS 4 |
| **State & Animation** | Zustand 5, Framer Motion 12, Lucide React 0.487 |
| **Backend** | Express 5, Node.js |
| **AI / Inference** | Cerebras API (SSE streaming), Gemma4 |
| **Diagrams & Export** | Mermaid 11.16, jsPDF, html2canvas |
| **File Processing** | Multer, pdf-parse, pdfjs-dist, mammoth, word-extractor, sharp |

## ⚙️ Prerequisites & Installation

### System Requirements
- **Node.js**: ≥ 20.x
- **npm**: ≥ 9.x
- **pdftoppm** (`poppler-utils`): Required for extracting images from PDFs.
- **API Key**: A valid Cerebras API key (or OpenAI-compatible endpoint).

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd cerebras-nexus
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   ```
   *Edit the `.env` file and add your Cerebras API key and URL.*

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Start the Application:**
   Run the server (port 3001) and client (port 5173) in parallel:
   ```bash
   npm start
   ```
   *(Alternatively, use `start.bat` on Windows or `bash start.sh` on Linux/Mac).*

## 💻 Usage

1. Open your browser and navigate to `http://localhost:5173`.
2. In the **CommandBar**, enter your infrastructure request (e.g., *"Multi-region serverless AWS architecture with Lambda, DynamoDB, API Gateway, and GDPR compliance"* ).
3. *(Optional)* Drag and drop requirement files (PDFs, DOCX, or existing architecture images).
4. Press **Enter** to launch the pipeline. Watch as the 8 agents execute sequentially with real-time streaming.
5. **Explore the Results:**
   - **Left Sidebar**: Track the status and progress of each AI agent.
   - **Center Panel**: View and interact with the generated Mermaid architecture diagram (zoom/pan) and inspect the code with visual diffs.
   - **Right Sidebar**: Review detailed assurance reports (Compliance, Security, Validation, Docs).
6. Click the export button in the top right to download a comprehensive **PDF Report**.

## 📂 Project Structure

```text
cerebras-nexus/
├── package.json                     # Root: npm workspaces config
├── start.sh / start.bat             # Startup scripts
├── .env.example                     # Environment variables template
│
├── shared/                          # @cerebras-nexus/shared
│   └── types.ts                     # Shared TypeScript interfaces
│
├── server/                          # @cerebras-nexus/server
│   └── src/
│       ├── index.ts                 # Express entry point (Port 3001)
│       ├── cerebras/stream.ts       # Cerebras API client with SSE + retry
│       ├── agents/prompts.ts        # System prompts for the 8 agents
│       ├── pipeline/orchestrator.ts # Sequential pipeline orchestrator
│       └── utils/                   # Parsers and file processors
│
└── client/                          # @cerebras-nexus/client
    └── src/
        ├── main.tsx / App.tsx       # React entry point
        ├── hooks/usePipelineStore.ts# Zustand state management
        ├── lib/                     # Constants, mocks, and PDF export logic
        └── components/              # UI Components (Sidebars, Workspaces, Panels)
            └── reports/             # Agent-specific report components
```

## 📄 License

This project is licensed under the [MIT License](LICENSE).
