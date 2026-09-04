const express = require("express");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");

const { generateAnswer } = require("../services/aiService");

const {
    addDocument,
    searchKnowledgeBase
} = require("../services/ragService");

const router = express.Router();


// ======================================================
// FILE UPLOAD CONFIGURATION
// ======================================================

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024 // 10 MB
    }
});


// ======================================================
// BASIC TEST
// ======================================================

router.get("/test", (req, res) => {
    res.json({
        message: "Ticket API is working"
    });
});


// ======================================================
// GEMINI AI TEST
// ======================================================

router.post("/ai-test", async (req, res) => {
    try {

        const ticket = req.body.ticket;

        if (!ticket) {
            return res.status(400).json({
                error: "Please provide a ticket"
            });
        }

        const answer = await generateAnswer(
            ticket,
            ""
        );

        res.json({
            ticket,
            answer
        });

    } catch (error) {

        console.error(
            "Gemini Error:",
            error
        );

        res.status(500).json({
            error: "Gemini request failed",
            details: error.message
        });
    }
});


// ======================================================
// MANUAL KNOWLEDGE-BASE INGESTION
// ======================================================

router.post("/knowledge/add", async (req, res) => {
    try {

        const {
            text,
            source
        } = req.body;

        if (!text) {
            return res.status(400).json({
                error: "Document text is required"
            });
        }

        const result = await addDocument(
            text,
            source || "manual-document"
        );

        res.json({
            success: true,
            message: "Document added to knowledge base",
            result
        });

    } catch (error) {

        console.error(
            "Knowledge Add Error:",
            error
        );

        res.status(500).json({
            error: "Failed to add document",
            details: error.message
        });
    }
});


// ======================================================
// DOCUMENT TEXT EXTRACTION
// ======================================================

async function extractTextFromFile(file) {

    const fileName =
        file.originalname.toLowerCase();


    // --------------------------------------------------
    // TXT
    // --------------------------------------------------

    if (
        file.mimetype === "text/plain" ||
        fileName.endsWith(".txt")
    ) {

        return file.buffer.toString("utf-8");
    }


    // --------------------------------------------------
    // PDF
    // --------------------------------------------------

    if (
        file.mimetype === "application/pdf" ||
        fileName.endsWith(".pdf")
    ) {

        const parser = new PDFParse({
            data: file.buffer
        });

        try {

            const result =
                await parser.getText();

            return result.text;

        } finally {

            await parser.destroy();
        }
    }


    // --------------------------------------------------
    // DOCX
    // --------------------------------------------------

    if (
        file.mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileName.endsWith(".docx")
    ) {

        const result =
            await mammoth.extractRawText({
                buffer: file.buffer
            });

        return result.value;
    }


    // --------------------------------------------------
    // UNSUPPORTED FILE
    // --------------------------------------------------

    throw new Error(
        "Unsupported file type. Please upload a .txt, .pdf, or .docx file."
    );
}


// ======================================================
// FILE UPLOAD → KNOWLEDGE BASE
// ======================================================

router.post(
    "/knowledge/upload",
    upload.single("document"),
    async (req, res) => {

        try {

            // ------------------------------------------------
            // CHECK FILE
            // ------------------------------------------------

            if (!req.file) {

                return res.status(400).json({
                    error: "Please upload a document"
                });
            }


            // ------------------------------------------------
            // EXTRACT TEXT
            // ------------------------------------------------

            const text =
                await extractTextFromFile(
                    req.file
                );


            // ------------------------------------------------
            // CHECK EXTRACTED TEXT
            // ------------------------------------------------

            if (
                !text ||
                !text.trim()
            ) {

                return res.status(400).json({
                    error:
                        "No readable text was found in the uploaded document"
                });
            }


            // ------------------------------------------------
            // ADD TO RAG KNOWLEDGE BASE
            // ------------------------------------------------

            const result =
                await addDocument(
                    text,
                    req.file.originalname
                );


            // ------------------------------------------------
            // SUCCESS RESPONSE
            // ------------------------------------------------

            res.json({

                success: true,

                message:
                    "Document uploaded and added to knowledge base",

                file: {

                    name:
                        req.file.originalname,

                    size:
                        req.file.size,

                    type:
                        req.file.mimetype

                },

                extractedCharacters:
                    text.length,

                result

            });

        } catch (error) {

            console.error(
                "Knowledge Upload Error:",
                error
            );

            res.status(500).json({

                error:
                    "Failed to process uploaded document",

                details:
                    error.message

            });
        }
    }
);


// ======================================================
// KNOWLEDGE-BASE SEARCH
// ======================================================

router.post(
    "/knowledge/search",
    async (req, res) => {

        try {

            const {
                query
            } = req.body;

            if (!query) {

                return res.status(400).json({
                    error:
                        "Search query is required"
                });
            }

            const results =
                await searchKnowledgeBase(
                    query,
                    3
                );

            res.json({

                query,

                results

            });

        } catch (error) {

            console.error(
                "Knowledge Search Error:",
                error
            );

            res.status(500).json({

                error:
                    "Knowledge base search failed",

                details:
                    error.message

            });
        }
    }
);


// ======================================================
// FULL RAG PIPELINE
// ======================================================

router.post(
    "/ask",
    async (req, res) => {

        try {

            const {
                ticket,
                classification
            } = req.body;


            // ------------------------------------------------
            // VALIDATE TICKET
            // ------------------------------------------------

            if (!ticket) {

                return res.status(400).json({
                    error:
                        "Ticket is required"
                });
            }


            // ------------------------------------------------
            // STEP 1: RETRIEVE RELEVANT DOCUMENTS
            // ------------------------------------------------

            const retrievedDocuments =
                await searchKnowledgeBase(
                    ticket,
                    3
                );


            // ------------------------------------------------
            // STEP 2: BUILD RAG CONTEXT
            // ------------------------------------------------

            const context =
                retrievedDocuments
                    .map(
                        (doc, index) => `
SOURCE ${index + 1}: ${doc.source}
CHUNK: ${doc.chunk ?? "N/A"}

${doc.content}
`
                    )
                    .join("\n");


            // ------------------------------------------------
            // STEP 3: GENERATE GROUNDED RESPONSE
            // ------------------------------------------------

            const answer =
                await generateAnswer(
                    ticket,
                    context
                );


            // ------------------------------------------------
            // STEP 4: EXTRACT UNIQUE SOURCES
            // ------------------------------------------------

            const sources = [
                ...new Set(
                    retrievedDocuments.map(
                        doc => doc.source
                    )
                )
            ];


            // ------------------------------------------------
            // STEP 5: RETURN COMPLETE RAG RESPONSE
            // ------------------------------------------------

            res.json({

                success: true,

                ticket,

                classification: classification || null,

                answer,

                sources,

                retrievedDocuments

            });

        } catch (error) {

            console.error(
                "RAG Ask Error:",
                error
            );

            res.status(500).json({

                error:
                    "RAG request failed",

                details:
                    error.message

            });
        }
    }
);


// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;