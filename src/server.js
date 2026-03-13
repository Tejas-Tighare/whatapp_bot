import express from "express";
import dotenv from "dotenv";
import webhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use(express.static("src/public"));

app.use("/", webhookRoutes);

app.get("/", (req,res)=>{
  res.send("WhatsApp Bot Running");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, ()=>{
  console.log(`Bot running on port ${PORT}`);
});