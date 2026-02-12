import express from "express";
import dotenv from "dotenv";
import webhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use("/", webhookRoutes);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () =>
  console.log(`Bot running on port ${PORT}`)
);
