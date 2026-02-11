import axios from "axios";
import { config } from "../config/whatsapp.js";

export const sendMessage = async (to, message) => {

  // ✅ STOP API call if credentials missing
  if (
    !config.token ||
    !config.phoneId ||
    config.token === "PASTE_LATER" ||
    config.phoneId === "PASTE_LATER"
  ) {
    console.log("⚠ WhatsApp not configured yet");
    console.log("To:", to);
    console.log("Message:", message);
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
  } catch (error) {
    console.error("❌ WhatsApp API Error:", error.response?.data || error.message);
  }
};
