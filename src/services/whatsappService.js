import axios from "axios";
import { config } from "../config/whatsapp.js";

export const sendMessage = async (to, message) => {
  try {
    if (!config.token || !config.phoneId) {
      console.log("Missing WhatsApp credentials");
      return;
    }

    await axios.post(
      `https://graph.facebook.com/v19.0/${config.phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message }
      },
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("WhatsApp API Error:",
      error.response?.data || error.message);
  }
};
