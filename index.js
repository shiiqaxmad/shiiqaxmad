const express = require("express");
const QRCode = require("qrcode");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

let sock;
let isStarted = false;
let qrImage = null;

// 🔥 SYSTEM STATES
let antiLink = true;
let muteGroup = false;

// 🌐 HOME (UPTIME)
app.get("/", (req, res) => {
  res.send("🤖 SHIIQ BOT RUNNING 24/7 ✅");
});

// 🚀 START BOT (FIXED)
async function startBot() {
  if (isStarted) return;
  isStarted = true;

  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    browser: Browsers.macOS("Shiiq Pro")
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrImage = await QRCode.toDataURL(qr);
      console.log("📷 QR READY");
    }

    if (connection === "open") {
      console.log("✅ CONNECTED");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("🔄 RECONNECTING...");
        isStarted = false;
        startBot();
      }
    }
  });

  // 👋 WELCOME / GOODBYE
  sock.ev.on("group-participants.update", async (update) => {
    const { id, participants, action } = update;

    for (let user of participants) {
      if (action === "add") {
        await sock.sendMessage(id, {
          text: `👋 Soo dhawoow @${user.split("@")[0]}`,
          mentions: [user]
        });
      }

      if (action === "remove") {
        await sock.sendMessage(id, {
          text: `😢 Nabad galyo @${user.split("@")[0]}`,
          mentions: [user]
        });
      }
    }
  });

  // 🤖 MAIN BOT
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const body = text.toLowerCase();

    let participants, isAdmin, isBotAdmin;

    if (isGroup) {
      const group = await sock.groupMetadata(from);
      participants = group.participants;

      const sender = msg.key.participant;
      const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

      isAdmin = participants.find(p => p.id === sender)?.admin;
      isBotAdmin = participants.find(p => p.id === botNumber)?.admin;
    }

    // 🔒 ANTI LINK
    if (isGroup && antiLink && body.includes("http")) {
      if (!isAdmin && isBotAdmin) {
        await sock.sendMessage(from, { delete: msg.key });
        await sock.sendMessage(from, { text: "🚫 Link lama ogola!" });
      }
    }

    // 🔇 MUTE
    if (isGroup && muteGroup && !isAdmin) {
      return sock.sendMessage(from, { delete: msg.key });
    }

    // 🔑 PREFIX
    if (!body.startsWith("shiiq")) return;
    const cmd = body.replace("shiiq", "").trim();

    // 💬 BASIC
    if (cmd === "hi") return sock.sendMessage(from, { text: "👋 Salaam!" });
    if (cmd === "ping") return sock.sendMessage(from, { text: "⚡ Alive!" });
    if (cmd === "owner") return sock.sendMessage(from, { text: "👑 Shiiqaxmad" });

    // 👮 GROUP COMMANDS
    if (cmd === "kick" && isGroup) {
      if (!isAdmin) return;
      if (!isBotAdmin) return;

      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
      if (mentioned) await sock.groupParticipantsUpdate(from, mentioned, "remove");
    }

    if (cmd === "tagall" && isGroup) {
      let teks = "📢 Tag All:\n\n";
      participants.forEach(p => {
        teks += `@${p.id.split("@")[0]}\n`;
      });

      await sock.sendMessage(from, {
        text: teks,
        mentions: participants.map(p => p.id)
      });
    }

    if (cmd === "mute" && isGroup) {
      if (!isAdmin) return;
      muteGroup = true;
      sock.sendMessage(from, { text: "🔇 Group muted" });
    }

    if (cmd === "unmute" && isGroup) {
      if (!isAdmin) return;
      muteGroup = false;
      sock.sendMessage(from, { text: "🔊 Group unmuted" });
    }

    if (cmd === "antilink on") {
      antiLink = true;
      sock.sendMessage(from, { text: "✅ Anti-link ON" });
    }

    if (cmd === "antilink off") {
      antiLink = false;
      sock.sendMessage(from, { text: "❌ Anti-link OFF" });
    }
  });
}

// 📲 PAIR (FIXED)
app.post("/pair", async (req, res) => {
  let number = req.body.number;

  if (!number) return res.send("❌ Number geli");

  number = number.replace(/[^0-9]/g, "");

  if (!number.startsWith("252")) {
    return res.send("❌ Format: 25261xxxxxxx");
  }

  try {
    if (!sock) await startBot();

    await new Promise(r => setTimeout(r, 4000));

    const code = await sock.requestPairingCode(number);

    res.send(`
    <html>
    <body style="background:black;color:#00ff00;text-align:center;padding-top:100px;">
      <h2>✅ Pairing Code</h2>
      <h1 style="font-size:40px;">${code}</h1>
    </body>
    </html>
    `);

  } catch {
    res.send("❌ Failed, try again!");
  }
});

// 📷 QR (FIXED)
app.get("/qr", async (req, res) => {
  if (!sock) await startBot();

  let attempts = 0;

  while (!qrImage && attempts < 10) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  if (!qrImage) return res.send("❌ QR not ready, refresh");

  res.send(`
  <html>
  <body style="background:black;text-align:center;padding-top:50px;">
    <h2 style="color:white;">📷 Scan QR</h2>
    <img src="${qrImage}" width="250"/>
  </body>
  </html>
  `);
});

// 🚀 SERVER
app.listen(PORT, () => {
  console.log("🚀 SHIIQ BOT RUNNING");
});
