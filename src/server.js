import express from "express";
import webhookRoutes from "./routes/webhookRoutes.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

// Health check
app.get("/ping", (req, res) => {
  res.send("pong");
});

// Routes
app.use("/", webhookRoutes);

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
