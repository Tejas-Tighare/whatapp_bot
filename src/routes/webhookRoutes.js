import express from "express";
import {
  verifyWebhook,
  receiveMessage
} from "../controllers/webhookController.js";

const router = express.Router();
router.get("/webhook", verifyWebhook);
router.post("/webhook", receiveMessage);

export default router;
