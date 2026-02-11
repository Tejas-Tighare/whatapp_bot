export const receiveMessage = async (req, res) => {
  try {
    const msg =
      req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (!msg) return res.sendStatus(200);

    // ✅ Only accept text messages
    if (msg.type !== "text") {
      return res.sendStatus(200);
    }

    // ✅ Ignore bot's own messages
    if (msg.from === "whatsapp_business_account") {
      return res.sendStatus(200);
    }

    // ✅ Deduplicate message IDs
    const messageId = msg.id;
    if (!global.processedIds) {
      global.processedIds = new Set();
    }
    if (global.processedIds.has(messageId)) {
      return res.sendStatus(200);
    }
    global.processedIds.add(messageId);

    const user = msg.from;
    const text = msg.text.body.trim();

    if (!sessions[user]) {
      sessions[user] = { step: "START" };
    }

    const s = sessions[user];

    // -------- START --------
    if (text.toLowerCase() === "hi") {
      s.step = "CITY";
      return sendMessage(
        user,
        buildList("Select City:", Object.keys(DIRECTORY))
      );
    }

    // -------- CITY --------
    if (s.step === "CITY") {
      const cities = Object.keys(DIRECTORY);
      const city = cities[text - 1];

      if (!city)
        return sendMessage(user, "Invalid choice. Try again.");

      s.city = city;
      s.step = "PRABHAG";

      return sendMessage(
        user,
        buildList("Select Prabhag:", Object.keys(DIRECTORY[city]))
      );
    }

    // -------- PRABHAG --------
    if (s.step === "PRABHAG") {
      const prabhags = Object.keys(DIRECTORY[s.city]);
      const prabhag = prabhags[text - 1];

      if (!prabhag)
        return sendMessage(user, "Invalid choice. Try again.");

      s.prabhag = prabhag;
      s.step = "WARD";

      return sendMessage(
        user,
        buildList(
          "Select Ward:",
          Object.keys(DIRECTORY[s.city][prabhag])
        )
      );
    }

    // -------- WARD --------
    if (s.step === "WARD") {
      const wards = Object.keys(
        DIRECTORY[s.city][s.prabhag]
      );

      const ward = wards[text - 1];

      if (!ward)
        return sendMessage(user, "Invalid choice. Try again.");

      s.ward = ward;
      s.step = "SERVICE";

      return sendMessage(
        user,
        buildList(
          "Select Service:",
          Object.keys(
            DIRECTORY[s.city][s.prabhag][ward]
          )
        )
      );
    }

    // -------- SERVICE --------
    if (s.step === "SERVICE") {
      const services = Object.keys(
        DIRECTORY[s.city][s.prabhag][s.ward]
      );

      const service = services[text - 1];

      if (!service)
        return sendMessage(user, "Invalid choice. Try again.");

      const people =
        DIRECTORY[s.city][s.prabhag][s.ward][service];

      let reply = `Available ${service}:\n\n`;

      people.forEach((p, i) => {
        reply += `${i + 1}. ${p.name}\n📞 ${p.phone}\n\n`;
      });

      delete sessions[user];
      return sendMessage(user, reply);
    }

    return res.sendStatus(200);
  } catch (err) {
    console.error("Webhook Controller Error:", err);
    return res.sendStatus(500);
  }
};
