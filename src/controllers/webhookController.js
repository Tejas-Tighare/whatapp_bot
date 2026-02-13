import { DIRECTORY } from "../data/directoryData.js";
import { sendMessage } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";

/* ================= STORAGE ================= */

const sessions = {};
const processed = new Map(); // messageId -> timestamp

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const DEDUP_TIMEOUT = 60 * 60 * 1000; // 1 hour

/* ================= CLEANUP TIMER ================= */

setInterval(() => {
  const now = Date.now();

  for (const id in sessions) {
    if (now - sessions[id].lastActive > SESSION_TIMEOUT) {
      delete sessions[id];
    }
  }

  for (const [id, time] of processed.entries()) {
    if (now - time > DEDUP_TIMEOUT) {
      processed.delete(id);
    }
  }
}, 10 * 60 * 1000);

/* ================= HELPERS ================= */

const toTitleCase = txt =>
  txt.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const buildList = (title, arr) =>
  `${title}\n\n` +
  arr.map((v, i) => `${i + 1}. ${toTitleCase(v)}`).join("\n");

/* ================= VERIFY WEBHOOK ================= */

export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

/* ================= MAIN HANDLER ================= */

export const receiveMessage = async (req, res) => {
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    if (!value?.messages) return res.sendStatus(200);

    const msg = value.messages[0];
    if (msg.type !== "text") return res.sendStatus(200);

    /* ================= GHOST MESSAGE PROTECTION ================= */

    const msgTimestamp = parseInt(msg.timestamp) * 1000; // seconds -> ms
    const now = Date.now();

    // Ignore messages older than 5 minutes (WhatsApp retry protection)
    if (now - msgTimestamp > 5 * 60 * 1000) {
      console.log("Ignored old WhatsApp retry:", msg.id);
      return res.sendStatus(200);
    }

    /* ================= DEDUP ================= */

    if (processed.has(msg.id)) return res.sendStatus(200);
    processed.set(msg.id, now);

    const user = msg.from;
    const text = msg.text.body.trim().toLowerCase();

    /* ================= SESSION INIT ================= */

    if (!sessions[user]) {
      sessions[user] = { step: "START", lastActive: now };
    }

    const s = sessions[user];
    s.lastActive = now;

    /* ================= START ================= */

    if (text === "hi" || text === "start") {
      s.step = "CITY";

      return sendMessage(
        user,
        buildList("Select City:", Object.keys(DIRECTORY))
      );
    }

    /* ================= CITY ================= */

    if (s.step === "CITY") {
      const list = Object.keys(DIRECTORY);
      const i = parseInt(text);

      if (!list[i - 1]) {
        return sendMessage(user, buildList("Select City:", list));
      }

      s.city = list[i - 1];
      s.step = "PRABHAG";

      return sendMessage(
        user,
        buildList(
          "Select Prabhag:",
          Object.keys(DIRECTORY[s.city])
        )
      );
    }

    /* ================= PRABHAG ================= */

    if (s.step === "PRABHAG") {
      const list = Object.keys(DIRECTORY[s.city]);
      const i = parseInt(text);

      if (!list[i - 1]) {
        return sendMessage(user, buildList("Select Prabhag:", list));
      }

      s.prabhag = list[i - 1];
      s.step = "WARD";

      return sendMessage(
        user,
        buildList(
          "Select Ward:",
          Object.keys(DIRECTORY[s.city][s.prabhag])
        )
      );
    }

    /* ================= WARD ================= */

    if (s.step === "WARD") {
      const list = Object.keys(
        DIRECTORY[s.city][s.prabhag]
      );

      const i = parseInt(text);

      if (!list[i - 1]) {
        return sendMessage(user, buildList("Select Ward:", list));
      }

      s.ward = list[i - 1];
      s.step = "SERVICE";

      const member =
        DIRECTORY[s.city][s.prabhag][s.ward].member;

      return sendMessage(
        user,
        `👤 Ward Member: ${member}\n\n` +
          buildList(
            "Select Service:",
            Object.keys(
              DIRECTORY[s.city][s.prabhag][s.ward].services
            )
          )
      );
    }

    /* ================= SERVICE ================= */

    if (s.step === "SERVICE") {
      const services =
        DIRECTORY[s.city][s.prabhag][s.ward].services;

      const list = Object.keys(services);
      const i = parseInt(text);

      if (!list[i - 1]) {
        return sendMessage(user, buildList("Select Service:", list));
      }

      const people = services[list[i - 1]];
      let reply = "";

      people.forEach(p => {
        reply += `${p.name}\n📞 ${p.phone}\n\n`;
      });

      delete sessions[user];

      return sendMessage(
        user,
        reply + "Type hi to start again."
      );
    }

    /* ================= FALLBACK ================= */

    return sendMessage(user, "Type hi to start.");

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.sendStatus(500);
  }
};
