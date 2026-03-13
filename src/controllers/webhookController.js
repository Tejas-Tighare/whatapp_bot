import {
  sendMessage,
  sendImage,
  sendButtons,
  sendList
} from "../services/whatsappService.js";

import { DEPARTMENTS, WARDS } from "../data/directoryData.js";
import { config } from "../config/whatsapp.js";

const sessions = {};

export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === config.verifyToken) {
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
};

export const receiveMessage = async (req, res) => {

  const value = req.body?.entry?.[0]?.changes?.[0]?.value;

  if (!value?.messages) return res.sendStatus(200);

  const msg = value.messages[0];
  const user = msg.from;

  let payload = msg.text?.body?.toLowerCase();

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
      "https://yourdomain.com/poster.jpg",
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
      { id: "dept_municipal", title: "Municipal" },
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

  return sendMessage(user, "Type hi to start");
};