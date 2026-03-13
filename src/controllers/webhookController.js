import {
  sendMessage,
  sendImage,
  sendButtons,
  sendList
} from "../services/whatsappService.js";

import { config } from "../config/whatsapp.js";
import { DEPARTMENTS, WARDS } from "../data/directoryData.js";

/* ================= STORAGE ================= */

const sessions = {};
const processed = new Map();

const DEDUP_TIMEOUT = 60 * 60 * 1000;
const MESSAGE_MAX_AGE = 60 * 1000;

/* ================= CLEANUP ================= */

setInterval(() => {

  const now = Date.now();

  for (const [id, time] of processed.entries()) {

    if (now - time > DEDUP_TIMEOUT) {
      processed.delete(id);
    }

  }

}, 10 * 60 * 1000);

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

    /* Ignore delivery/read receipts */

    if (value?.statuses) {
      return res.sendStatus(200);
    }

    if (!value?.messages) {
      return res.sendStatus(200);
    }

    const msg = value.messages[0];

    /* Dedup */

    if (processed.has(msg.id)) {
      return res.sendStatus(200);
    }

    processed.set(msg.id, Date.now());

    /* Ignore old retry */

    const msgTimestamp = parseInt(msg.timestamp) * 1000;
    const now = Date.now();

    if (now - msgTimestamp > MESSAGE_MAX_AGE) {
      console.log("Ignored old message retry");
      return res.sendStatus(200);
    }

    const user = msg.from;

    let payload = "";

    if (msg.type === "text") {
      payload = msg.text.body.toLowerCase();
    }

    if (msg.type === "interactive") {
      payload =
        msg.interactive.button_reply?.id ||
        msg.interactive.list_reply?.id;
    }

    if (!sessions[user]) {
      sessions[user] = { step: "START" };
    }

    const s = sessions[user];

    /* START */

    if (payload === "hi" || payload === "start") {

      s.step = "LANG";

      await sendImage(
        user,
        "https://whatapp-bot-s5br.onrender.com/poster.jpg",
        "Welcome to Citizen Help Bot"
      );

      return sendButtons(user, "Select Language", [
        { type: "reply", reply: { id: "lang_en", title: "English" } },
        { type: "reply", reply: { id: "lang_hi", title: "हिंदी" } },
        { type: "reply", reply: { id: "lang_mr", title: "मराठी" } }
      ]);
    }

    /* LANGUAGE */

    if (payload.startsWith("lang")) {

      s.step = "STATE";

      return sendButtons(user, "Select State", [
        { type: "reply", reply: { id: "state_mh", title: "Maharashtra" } }
      ]);
    }

    /* STATE */

    if (payload === "state_mh") {

      s.step = "CITY";

      return sendList(user, "Select City", [
        { id: "city_amravati", title: "Amravati" },
        { id: "city_nagpur", title: "Nagpur" },
        { id: "city_akola", title: "Akola" }
      ]);
    }

    /* CITY */

    if (payload.startsWith("city")) {

      const city = payload.split("_")[1];

      if (city !== "amravati") {
        delete sessions[user];
        return sendMessage(user, "Directory available only for Amravati.");
      }

      s.step = "WARD";

      return sendList(
        user,
        "Select Ward",
        WARDS.map(w => ({
          id: `ward_${w}`,
          title: `Ward ${w}`
        }))
      );
    }

    /* WARD */

    if (payload.startsWith("ward")) {

      s.step = "DEPT";

      return sendList(user, "Select Department", [
        { id: "dept_municipal", title: "Municipal Corporation" },
        { id: "dept_mseb", title: "MSEB Electricity" },
        { id: "dept_health", title: "Health Department" },
        { id: "dept_water", title: "Water Supply" },
        { id: "dept_waste", title: "Waste Management" }
      ]);
    }

    /* DEPARTMENT */

    if (payload.startsWith("dept")) {

      const key = payload.split("_")[1];

      const officer = DEPARTMENTS[key];

      delete sessions[user];

      return sendMessage(
        user,
        `Officer: ${officer.name}\n📞 ${officer.phone}\n\nType hi to restart`
      );
    }

    return sendMessage(user, "Type hi to start.");

  } catch (err) {

    console.error("Webhook Error:", err);

    return res.sendStatus(500);

  }
};