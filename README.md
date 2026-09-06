<p align="center">
  <h1 align="center">🎫 TicketPilot</h1>
</p>

<p align="center">
  <b>AI-powered customer support ticket classification, RAG assistance, and human review platform</b>
</p>

<p align="center">
  Classify • Retrieve • Analyze • Assist • Review • Resolve
</p>

---

## 📖 Overview

TicketPilot is an AI-powered customer support platform designed to automate the processing of support tickets while keeping human agents in control of important or sensitive cases.

The system combines AI-based ticket classification, sentiment and priority analysis, Retrieval-Augmented Generation (RAG), knowledge-base retrieval, automated response generation, bulk ticket processing, and human review workflows into a unified support platform.

TicketPilot is designed around a hybrid AI + human workflow:

**AI handles routine analysis and response generation, while human agents can review, edit, approve, or take over tickets when required.**

### What it does

- 🎫 **Ticket Management** — Create, view, and manage customer support tickets.
- 🤖 **AI Classification** — Automatically classify incoming tickets.
- 🏷️ **Category Detection** — Identify the category of the customer's issue.
- ⚡ **Priority Detection** — Determine ticket urgency.
- 💬 **Sentiment Analysis** — Analyze customer sentiment.
- 👤 **Human Escalation** — Identify tickets requiring human intervention.
- 📚 **RAG Knowledge Retrieval** — Retrieve relevant information from the knowledge base.
- 🧠 **AI Response Generation** — Generate responses using retrieved knowledge.
- 🔍 **Retrieved Sources** — Display the documents and chunks used by the AI.
- 👨‍💼 **Human Review** — Allow agents to review AI-generated responses.
- ✏️ **Edit & Send** — Modify an AI response before approving it.
- ✅ **Approve & Send** — Approve an AI-generated response.
- 🛠️ **Take Over Manually** — Allow an agent to take control of a ticket.
- 📊 **Bulk Import** — Process multiple tickets from CSV, XLSX, and XLS files.
- 📈 **Processing Progress** — Track bulk ticket processing progress.
- 🧾 **Ticket History** — Maintain ticket status and review information.
- 🔄 **Workflow Automation** — Use n8n to orchestrate AI ticket processing and response workflows.

---

## 🏗️ System Architecture

```mermaid
flowchart LR

    USER["👤 Customer / Agent"]

    subgraph FRONTEND["🖥️ FRONTEND"]
        UI["React Dashboard"]
        TICKET["Ticket Management"]
        BULK["Bulk Import"]
        REVIEW["Human Review"]
        UI --> TICKET
        UI --> BULK
        UI --> REVIEW
    end

    subgraph AUTOMATION["⚙️ n8n AUTOMATION"]
        WEBHOOK["Ticket Webhook"]
        CLASSIFY["AI Classification"]
        RESPONSE["Customer Response Workflow"]

        WEBHOOK --> CLASSIFY
    end

    subgraph BACKEND["☁️ BACKEND"]
        API["Node.js / Express API"]
        RAG["RAG Pipeline"]
        KB["Knowledge Base"]
        LLM["Gemini AI"]
        
        API --> RAG
        RAG --> KB
        RAG --> LLM
    end

    USER --> UI
    UI --> WEBHOOK
    CLASSIFY --> API
    API --> RESPONSE
    RESPONSE --> UI
