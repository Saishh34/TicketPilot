require("dotenv").config();

const express = require("express");
const cors = require("cors");

const ticketRoutes = require("./routes/ticketRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "TicketPilot Backend is running",
        status: "OK"
    });
});

app.use("/api/tickets", ticketRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`TicketPilot server running on http://localhost:${PORT}`);
});
