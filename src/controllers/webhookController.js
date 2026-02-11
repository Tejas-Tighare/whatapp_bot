import { sendMessage } from "../services/whatsappService.js";
import { DIRECTORY } from "../data/directoryData.js";

// ================= MEMORY =================

const sessions = {};
const processedIds = new Set();

// ================= VERIFY =================

export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === process.env.VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
};

// ================= HELPERS =================

function buildList(title, arr) {
  return `${title}\n\n${arr.map((v, i) => `${i + 1}. ${v}`).join("\n")}`;
}

// ================= RECEIVE MESSAGE =================

export const receiveMessage = async (req, res) => {

  // ACK FAST
  res.sendStatus(200);

  try {
    console.log("🔥 Webhook hit it");

    const msg =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!msg) return;

    if (msg.type !== "text") return;

    // Dedup
    if (processedIds.has(msg.id)) return;
    processedIds.add(msg.id);

    const user = msg.from;
    const text = msg.text.body.trim().toLowerCase();

    console.log("From:", user, "Text:", text);

    if (!sessions[user]) {
      sessions[user] = { step: "START" };
    }

    const s = sessions[user];

    // -------- START --------
    if (text === "hi") {
      sessions[user] = { step: "CITY" };

      await sendMessage(
        user,
        buildList("Select City:", Object.keys(DIRECTORY))
      );
      return;
    }

    if (s.step === "START") {
      await sendMessage(user, "Send *hi* to start.");
      return;
    }

    // -------- CITY --------
    if (s.step === "CITY") {
      const city = Object.keys(DIRECTORY)[Number(text) - 1];
      if (!city) {
        await sendMessage(user, "Invalid choice. Try again.");
        return;
      }

      s.city = city;
      s.step = "PRABHAG";

      await sendMessage(
        user,
        buildList("Select Prabhag:", Object.keys(DIRECTORY[city]))
      );
      return;
    }

    // -------- PRABHAG --------
    if (s.step === "PRABHAG") {
      const prabhag =
        Object.keys(DIRECTORY[s.city])[Number(text) - 1];

      if (!prabhag) {
        await sendMessage(user, "Invalid choice. Try again.");
        return;
      }

      s.prabhag = prabhag;
      s.step = "WARD";

      await sendMessage(
        user,
        buildList(
          "Select Ward:",
          Object.keys(DIRECTORY[s.city][prabhag])
        )
      );
      return;
    }

    // -------- WARD --------
    if (s.step === "WARD") {
      const ward =
        Object.keys(DIRECTORY[s.city][s.prabhag])[Number(text) - 1];

      if (!ward) {
        await sendMessage(user, "Invalid choice. Try again.");
        return;
      }

      s.ward = ward;
      s.step = "SERVICE";

      await sendMessage(
        user,
        buildList(
          "Select Service:",
          Object.keys(DIRECTORY[s.city][s.prabhag][ward])
        )
      );
      return;
    }

    // -------- SERVICE --------
    if (s.step === "SERVICE") {
      const service =
        Object.keys(
          DIRECTORY[s.city][s.prabhag][s.ward]
        )[Number(text) - 1];

      if (!service) {
        await sendMessage(user, "Invalid choice. Try again.");
        return;
      }

      const people =
        DIRECTORY[s.city][s.prabhag][s.ward][service];

      let reply = `Available ${service}:\n\n`;

      people.forEach((p, i) => {
        reply += `${i + 1}. ${p.name}\n📞 ${p.phone}\n\n`;
      });

      delete sessions[user];

      await sendMessage(user, reply);
      return;
    }

  } catch (err) {
    console.error("Webhook Error:", err);
  }
};
