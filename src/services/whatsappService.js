import axios from "axios";
import { config } from "../config/whatsapp.js";

const url = `https://graph.facebook.com/v18.0/${config.phoneId}/messages`;

const headers = {
  Authorization: `Bearer ${config.token}`,
  "Content-Type": "application/json"
};

export const sendMessage = async (to, message) => {
  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        text: { body: message }
      },
      { headers }
    );
  } catch (err) {
    console.error("Send Message Error:", err.response?.data || err.message);
  }
};

export const sendImage = async (to, imageUrl, caption) => {
  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "image",
        image: {
          link: imageUrl,
          caption
        }
      },
      { headers }
    );
  } catch (err) {
    console.error("Send Image Error:", err.response?.data || err.message);
  }
};

export const sendButtons = async (to, body, buttons) => {
  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: { buttons }
        }
      },
      { headers }
    );
  } catch (err) {
    console.error("Send Button Error:", err.response?.data || err.message);
  }
};

export const sendList = async (to, title, rows) => {
  try {
    await axios.post(
      url,
      {
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "list",
          body: { text: title },
          action: {
            button: "Select",
            sections: [
              {
                title: "Options",
                rows
              }
            ]
          }
        }
      },
      { headers }
    );
  } catch (err) {
    console.error("Send List Error:", err.response?.data || err.message);
  }
};