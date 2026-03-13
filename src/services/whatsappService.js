import axios from "axios";
import { config } from "../config/whatsapp.js";

const url = `https://graph.facebook.com/v18.0/${config.phoneId}/messages`;

const headers = {
  Authorization: `Bearer ${config.token}`,
  "Content-Type": "application/json"
};

export const sendMessage = async (to, message) => {
  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      text: { body: message }
    },
    { headers }
  );
};

export const sendImage = async (to, image, caption) => {
  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      to,
      type: "image",
      image: {
        link: image,
        caption
      }
    },
    { headers }
  );
};

export const sendButtons = async (to, body, buttons) => {
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
};

export const sendList = async (to, title, rows) => {
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
};