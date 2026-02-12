import { DIRECTORY } from "../data/directoryData.js";
import { sendMessage } from "../services/whatsappService.js";
import { config } from "../config/whatsapp.js";

const sessions = {};

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
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg?.text?.body) return res.sendStatus(200);

  const user = msg.from;
  const text = msg.text.body.trim();

  sessions[user] ??= { step: "START" };
  const s = sessions[user];

  if (text.toLowerCase() === "hi") {
    s.step = "PRABHAG";
    return sendMessage(
      user,
      buildList("Select Prabhag:", Object.keys(DIRECTORY.Amravati))
    );
  }

  if (s.step === "PRABHAG") {
    const p = Object.keys(DIRECTORY.Amravati)[text - 1];
    if (!p) return sendMessage(user, "Invalid choice");
    s.prabhag = p;
    s.step = "WARD";
    return sendMessage(
      user,
      buildList("Select Ward:", Object.keys(DIRECTORY.Amravati[p]))
    );
  }

  if (s.step === "WARD") {
    const w =
      Object.keys(DIRECTORY.Amravati[s.prabhag])[text - 1];
    if (!w) return sendMessage(user, "Invalid choice");

    s.ward = w;
    s.step = "SERVICE";

    const member =
      DIRECTORY.Amravati[s.prabhag][w].member;

    return sendMessage(
      user,
      `👤 Ward Member: ${member}\n\n` +
      buildList(
        "Select Service:",
        Object.keys(
          DIRECTORY.Amravati[s.prabhag][w].services
        )
      )
    );
  }

  if (s.step === "SERVICE") {
    const services =
      DIRECTORY.Amravati[s.prabhag][s.ward].services;

    const service =
      Object.keys(services)[text - 1];

    if (!service) return sendMessage(user, "Invalid choice");

    const people = services[service];

    let reply = `Available ${service}:\n\n`;
    people.forEach(p => {
      reply += `${p.name}\n📞 ${p.phone}\n\n`;
    });

    delete sessions[user];
    return sendMessage(user, reply);
  }

  res.sendStatus(200);
};
