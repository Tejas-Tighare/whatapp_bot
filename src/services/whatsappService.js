import axios from "axios";
import { config } from "../config/whatsapp.js";

export const sendMessage = async (to, message) => {
  if (!config.token || !config.phoneId) {
    console.log("WhatsApp not configured");
    return;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${config.phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.error("WhatsApp API Error:", err.response?.data || err.message);
  }
};
