const { ChromaClient, CloudClient } = require("chromadb");
const {
    GoogleGenerativeAIEmbeddings
} = require("@langchain/google-genai");

const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GOOGLE_API_KEY
});

// Use Chroma Cloud when cloud credentials are configured.
// Otherwise, use the local Chroma server for development.
const chroma = process.env.CHROMA_API_KEY
    ? new CloudClient({
        apiKey: process.env.CHROMA_API_KEY,
        tenant: process.env.CHROMA_TENANT,
        database: process.env.CHROMA_DATABASE
    })
    : new ChromaClient({
        host: process.env.CHROMA_HOST || "127.0.0.1",
        port: Number(process.env.CHROMA_PORT || 8000)
    });

const COLLECTION_NAME = "ticketpilot_knowledge";

async function getCollection() {
    return await chroma.getOrCreateCollection({
        name: COLLECTION_NAME,
        embeddingFunction: null
    });
}

function chunkText(text, chunkSize = 500) {
    const cleaned = String(text).replace(/\s+/g, " ").trim();

    if (!cleaned) return [];

    const words = cleaned.split(" ");
    const chunks = [];

    for (let i = 0; i < words.length; i += chunkSize) {
        chunks.push(
            words.slice(i, i + chunkSize).join(" ")
        );
    }

    return chunks;
}

function makeChunkId(source, index) {
    const safeSource = String(source)
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 100);

    return `${safeSource}-chunk-${index}`;
}

async function addDocument(text, source = "unknown") {
    const collection = await getCollection();
    const chunks = chunkText(text);

    if (!chunks.length) {
        throw new Error("Document contains no usable text");
    }

    const vectors = await embeddings.embedDocuments(chunks);

    const ids = chunks.map((_, index) =>
        makeChunkId(source, index)
    );

    await collection.upsert({
        ids,
        documents: chunks,
        embeddings: vectors,
        metadatas: chunks.map((_, index) => ({
            source,
            chunk: index,
            totalChunks: chunks.length
        }))
    });

    return {
        source,
        chunksAdded: chunks.length
    };
}

async function searchKnowledgeBase(query, numberOfResults = 3) {
    const collection = await getCollection();

    const queryEmbedding = await embeddings.embedQuery(query);

    const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: numberOfResults,
        include: [
            "documents",
            "metadatas",
            "distances"
        ]
    });

    const documents = results.documents?.[0] || [];
    const metadatas = results.metadatas?.[0] || [];
    const distances = results.distances?.[0] || [];

    // Lower Chroma distance = higher semantic similarity.
    // Results above this threshold are considered insufficiently relevant.
    const MAX_DISTANCE = 0.9;

    return documents
        .map((document, index) => ({
            content: document,
            source: metadatas[index]?.source || "unknown",
            chunk: metadatas[index]?.chunk ?? null,
            distance: distances[index] ?? null
        }))
        .filter((doc) =>
            doc.distance !== null &&
            doc.distance <= MAX_DISTANCE
        );
}

module.exports = {
    addDocument,
    searchKnowledgeBase
};