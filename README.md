# TicketPilot

AI-powered support ticket assistant with:
- Gemini-powered response generation
- RAG over a Chroma vector database
- Google Gemini embeddings
- Knowledge-base ingestion and semantic search
- Grounded answers with retrieved source metadata

## Current structure

backend/
  routes/ticketRoutes.js
  services/aiService.js
  services/ragService.js
  server.js
  package.json
  .env.example

knowledge_base/
  refund-policy.txt

rag/
  chroma_data/   # created by Chroma at runtime

## Backend

Run from backend:

npm install
node server.js

## Chroma

Run from backend in a second terminal:

chroma run --path ../rag/chroma_data --host 127.0.0.1

## Environment

Copy .env.example to .env and put the replacement Google API key in .env.
Never commit .env to GitHub.

## API

GET  /api/tickets/test
POST /api/tickets/ai-test
POST /api/tickets/knowledge/add
POST /api/tickets/knowledge/search
POST /api/tickets/ask
