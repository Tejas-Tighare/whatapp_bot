import { DIRECTORY } from "../data/directoryData.js";
import { sendMessage } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";

const sessions = {};
const processedMessages = new Set(); // ✅ Deduplication

export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

const buildList = (title, arr) =>
  `${title}\n\n` + arr.map((v, i) => `${i + 1}. ${v}`).join("\n");

export const receiveMessage = async (req, res) => {
  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;

    // ✅ Ignore non-message events
    if (!value?.messages) return res.sendStatus(200);

    const msg = value.messages[0];

    // ✅ Only text messages
    if (msg.type !== "text") return res.sendStatus(200);

    // ✅ Ignore duplicate WhatsApp retries
    if (processedMessages.has(msg.id)) {
      return res.sendStatus(200);
    }
    processedMessages.add(msg.id);

    const user = msg.from;
    const text = msg.text.body.trim();

    if (!sessions[user]) {
      sessions[user] = { step: "START" };
    }

    const s = sessions[user];

    // ================= START =================
    if (text.toLowerCase() === "hi") {
      s.step = "PRABHAG";
      return sendMessage(
        user,
        buildList("Select Prabhag:", Object.keys(DIRECTORY.Amravati))
      );
    }

    // ================= PRABHAG =================
    if (s.step === "PRABHAG") {
      const index = parseInt(text);
      if (isNaN(index)) {
        return sendMessage(user, "Enter valid number.");
      }

      const prabhag =
        Object.keys(DIRECTORY.Amravati)[index - 1];

      if (!prabhag) {
        return sendMessage(user, "Invalid choice.");
      }

      s.prabhag = prabhag;
      s.step = "WARD";

      return sendMessage(
        user,
        buildList(
          "Select Ward:",
          Object.keys(DIRECTORY.Amravati[prabhag])
        )
      );
    }

    // ================= WARD =================
    if (s.step === "WARD") {
      const index = parseInt(text);
      if (isNaN(index)) {
        return sendMessage(user, "Enter valid number.");
      }

      const ward =
        Object.keys(DIRECTORY.Amravati[s.prabhag])[index - 1];

      if (!ward) {
        return sendMessage(user, "Invalid choice.");
      }

      s.ward = ward;
      s.step = "SERVICE";

      const member =
        DIRECTORY.Amravati[s.prabhag][ward].member;

      return sendMessage(
        user,
        `👤 Ward Member: ${member}\n\n` +
          buildList(
            "Select Service:",
            Object.keys(
              DIRECTORY.Amravati[s.prabhag][ward].services
            )
          )
      );
    }

    // ================= SERVICE =================
    if (s.step === "SERVICE") {
      const index = parseInt(text);
      if (isNaN(index)) {
        return sendMessage(user, "Enter valid number.");
      }

      const services =
        DIRECTORY.Amravati[s.prabhag][s.ward].services;

      const service =
        Object.keys(services)[index - 1];

      if (!service) {
        return sendMessage(user, "Invalid choice.");
      }

      const people = services[service];

      let reply = `Available ${service}:\n\n`;

      people.forEach(p => {
        reply += `${p.name}\n📞 ${p.phone}\n\n`;
      });

      // ✅ Reset session safely
      sessions[user] = { step: "START" };

      return sendMessage(
        user,
        reply + "\nType hi to start again."
      );
    }

    return res.sendStatus(200);

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.sendStatus(500);
  }
};
