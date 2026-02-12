import { DIRECTORY } from "../data/directoryData.js";
import { sendMessage } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";

const sessions = {};
const processedMessages = new Set();

// ================= Helper: Title Case =================
const toTitleCase = (text) =>
  text
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// ================= Helper: Build Numbered List =================
const buildList = (title, arr) =>
  `${title}\n\n` +
  arr.map((v, i) => `${i + 1}. ${toTitleCase(v)}`).join("\n");

// ================= Webhook Verification =================
export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
};

// ================= Main Message Controller =================
export const receiveMessage = async (req, res) => {
  try {
    const value = req.body.entry?.[0]?.changes?.[0]?.value;

    if (!value?.messages) return res.sendStatus(200);

    const msg = value.messages[0];

    if (msg.type !== "text") return res.sendStatus(200);

    // Deduplicate WhatsApp retries
    if (processedMessages.has(msg.id)) {
      return res.sendStatus(200);
    }
    processedMessages.add(msg.id);

    const user = msg.from;
    const text = msg.text.body.trim().toLowerCase();

    if (!sessions[user]) {
      sessions[user] = { step: "START" };
    }

    const s = sessions[user];

    // ================= GLOBAL START =================
    if (text === "hi" || text === "start") {
      s.step = "PRABHAG";

      return sendMessage(
        user,
        buildList(
          "Select Prabhag:",
          Object.keys(DIRECTORY.Amravati)
        )
      );
    }

    // ================= PRABHAG =================
    if (s.step === "PRABHAG") {
      const list = Object.keys(DIRECTORY.Amravati);
      const index = parseInt(text);

      if (isNaN(index) || !list[index - 1]) {
        return sendMessage(
          user,
          "Invalid option. Please choose again.\n\n" +
            buildList("Select Prabhag:", list)
        );
      }

      s.prabhag = list[index - 1];
      s.step = "WARD";

      return sendMessage(
        user,
        buildList(
          "Select Ward:",
          Object.keys(DIRECTORY.Amravati[s.prabhag])
        )
      );
    }

    // ================= WARD =================
    if (s.step === "WARD") {
      const list =
        Object.keys(DIRECTORY.Amravati[s.prabhag]);

      const index = parseInt(text);

      if (isNaN(index) || !list[index - 1]) {
        return sendMessage(
          user,
          "Invalid option. Please choose again.\n\n" +
            buildList("Select Ward:", list)
        );
      }

      s.ward = list[index - 1];
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

    // ================= SERVICE =================
    if (s.step === "SERVICE") {
      const services =
        DIRECTORY.Amravati[s.prabhag][s.ward].services;

      const list = Object.keys(services);
      const index = parseInt(text);

      if (isNaN(index) || !list[index - 1]) {
        return sendMessage(
          user,
          "Invalid option. Please choose again.\n\n" +
            buildList("Select Service:", list)
        );
      }

      const service = list[index - 1];
      const people = services[service];

      let reply = `Available ${toTitleCase(service)}:\n\n`;

      people.forEach(p => {
        reply += `${p.name}\n📞 ${p.phone}\n\n`;
      });

      // Reset session
      sessions[user] = { step: "START" };

      return sendMessage(
        user,
        reply + "\nType 'hi' or 'start' to begin again."
      );
    }

    // ================= FALLBACK =================
    return sendMessage(
      user,
      "Please type 'hi' or 'start' to begin the conversation."
    );

  } catch (err) {
    console.error("Webhook Error:", err);
    return res.sendStatus(500);
  }
};
