import { sendMessage } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";

export const verifyWebhook = (req, res) => {
  if (req.query["hub.verify_token"] === config.verifyToken) {
    return res.send(req.query["hub.challenge"]);
  }
  return res.sendStatus(403);
};

export const receiveMessage = async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

  if (!msg) return res.sendStatus(200);

  const from = msg.from;
  const text = msg.text.body.toLowerCase();

  let reply = "";

  if (text === "hi") {
    reply = "1. Services\n2. Pricing\n3. Contact";
  } 
  else if (text === "1") {
    reply = "We provide website and app development.";
  } 
  else if (text === "2") {
    reply = "Pricing starts from ₹5000.";
  } 
  else if (text === "3") {
    reply = "Call +91XXXXXXXXXX";
  } 
  else {
    reply = "Type Hi to start.";
  }

  await sendMessage(from, reply);
  res.sendStatus(200);
};
