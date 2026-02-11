import { sendMessage } from "../services/whatsappService.js";
import { DIRECTORY } from "../data/directoryData.js";
import { config } from "../config/whatsapp.js";

const sessions = {};   // in-memory cache

// ---------------- VERIFY ----------------

export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// ---------------- HELPERS ----------------

function buildList(title, arr) {
  let msg = `${title}\n\n`;
  arr.forEach((v, i) => {
    msg += `${i + 1}. ${v}\n`;
  });
  return msg;
}

// ---------------- RECEIVE ----------------

export const receiveMessage = async (req, res) => {
  try {
    const msg =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!msg) return res.sendStatus(200);

    const user = msg.from;
    const text = msg.text?.body?.trim();

    if (!sessions[user]) {
      sessions[user] = { step: "START" };
    }

    const s = sessions[user];

    // START
    if (text.toLowerCase() === "hi") {
      s.step = "CITY";
      return sendMessage(user,
        buildList("Select City:", Object.keys(DIRECTORY))
      );
    }

    // CITY
    if (s.step === "CITY") {
      const cities = Object.keys(DIRECTORY);
      const city = cities[text - 1];
      if (!city) return sendMessage(user, "Invalid choice.");

      s.city = city;
      s.step = "PRABHAG";

      return sendMessage(user,
        buildList("Select Prabhag:",
          Object.keys(DIRECTORY[city]))
      );
    }

    // PRABHAG
    if (s.step === "PRABHAG") {
      const prabhags = Object.keys(DIRECTORY[s.city]);
      const p = prabhags[text - 1];
      if (!p) return sendMessage(user, "Invalid choice.");

      s.prabhag = p;
      s.step = "WARD";

      return sendMessage(user,
        buildList("Select Ward:",
          Object.keys(DIRECTORY[s.city][p]))
      );
    }

    // WARD
    if (s.step === "WARD") {
      const wards = Object.keys(
        DIRECTORY[s.city][s.prabhag]
      );
      const w = wards[text - 1];
      if (!w) return sendMessage(user, "Invalid choice.");

      s.ward = w;
      s.step = "SERVICE";

      return sendMessage(user,
        buildList("Select Service:",
          Object.keys(
            DIRECTORY[s.city][s.prabhag][w]
          ))
      );
    }

    // SERVICE
    if (s.step === "SERVICE") {
      const services = Object.keys(
        DIRECTORY[s.city][s.prabhag][s.ward]
      );
      const service = services[text - 1];
      if (!service) return sendMessage(user, "Invalid choice.");

      const people =
        DIRECTORY[s.city][s.prabhag][s.ward][service];

      let reply = `Available ${service}:\n\n`;
      people.forEach((p, i) => {
        reply += `${i + 1}. ${p.name}\n📞 ${p.phone}\n\n`;
      });

      delete sessions[user];
      return sendMessage(user, reply);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Error:", err);
    res.sendStatus(500);
  }
};
