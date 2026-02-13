import { DIRECTORY } from "../data/directoryData.js";
import { sendMessage } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";

/* ================= STORAGE ================= */

const sessions = {};
const processed = new Map(); // messageId -> timestamp

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 min
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
}, 10 * 60 * 1000); // every 10 min

/* ================= HELPERS ================= */

const toTitleCase = txt =>
  txt.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const buildList = (title, arr) =>
  `${title}\n\n` + arr.map((v, i) => `${i + 1}. ${toTitleCase(v)}`).join("\n");

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

    /* ---- Dedup ---- */
    if (processed.has(msg.id)) return res.sendStatus(200);
    processed.set(msg.id, Date.now());

    const user = msg.from;
    const text = msg.text.body.trim().toLowerCase();

    /* ---- Session ---- */
    if (!sessions[user]) {
      sessions[user] = { step: "START", lastActive: Date.now() };
    }

    const s = sessions[user];
    s.lastActive = Date.now();

    /* ---- Expired Session ---- */
    if (Date.now() - s.lastActive > SESSION_TIMEOUT) {
      delete sessions[user];
      return sendMessage(user, "Session expired. Send hi to start again.");
    }

    /* ================= START ================= */

    if (text === "hi" || text === "start") {
      s.step = "PRABHAG";

      return sendMessage(
        user,
        buildList("Select Prabhag:", Object.keys(DIRECTORY.Amravati))
      );
    }

    /* ================= PRABHAG ================= */

    if (s.step === "PRABHAG") {
      const list = Object.keys(DIRECTORY.Amravati);
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
          Object.keys(DIRECTORY.Amravati[s.prabhag])
        )
      );
    }

    /* ================= WARD ================= */

    if (s.step === "WARD") {
      const list = Object.keys(DIRECTORY.Amravati[s.prabhag]);
      const i = parseInt(text);

      if (!list[i - 1]) {
        return sendMessage(user, buildList("Select Ward:", list));
      }

      s.ward = list[i - 1];
      s.step = "SERVICE";

      const member =
        DIRECTORY.Amravati[s.prabhag][s.ward].member;

      return sendMessage(
        user,
        `👤 Ward Member: ${member}\n\n` +
          buildList(
            "Select Service:",
            Object.keys(
              DIRECTORY.Amravati[s.prabhag][s.ward].services
            )
          )
      );
    }

    /* ================= SERVICE ================= */

    if (s.step === "SERVICE") {
      const services =
        DIRECTORY.Amravati[s.prabhag][s.ward].services;

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
