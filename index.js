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

// 🌐 HOME
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:linear-gradient(135deg,#141e30,#243b55);color:white;text-align:center;padding-top:150px;font-family:Arial;">
    <h1>🤖 SHIIQ BOT PRO</h1>
    <p>Ultimate Version 🚀</p>

    <a href="/pair" style="padding:12px 25px;background:#00ffcc;color:black;border-radius:10px;">📲 Pair</a>
    <br><br>
    <a href="/qr" style="padding:12px 25px;background:#00ffcc;color:black;border-radius:10px;">📷 QR</a>
  </body>
  </html>
  `);
});

// 📲 PAIR
app.get("/pair", (req, res) => {
  res.send(`
  <html>
  <body style="background:#111;color:white;text-align:center;padding-top:100px;">
    <h2>📲 Pair WhatsApp</h2>
    <form method="POST" action="/pair">
      <input name="number" placeholder="25261xxxxxxx" required style="padding:10px;border-radius:10px;">
      <br><br>
      <button style="padding:10px 20px;background:#00ffcc;border:none;border-radius:10px;">GET CODE</button>
    </form>
    <br>
    <a href="/qr">📷 Use QR</a>
  </body>
  </html>
  `);
});

// 🚀 START BOT
async function startBot() {
  if (isStarted) return;
  isStarted = true;

  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    browser: Browsers.macOS("Shiiq Ultimate")
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) qrImage = await QRCode.toDataURL(qr);

    if (connection === "open") console.log("✅ CONNECTED");

    if (connection === "close") {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        isStarted = false;
        startBot();
      }
    }
  });

  // 🤖 BOT LOGIC
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

    // 🔥 AUTO AI (simple)
    if (!body.startsWith("shiiq")) {
      if (body.includes("sidee tahay"))
        return sock.sendMessage(from, { text: "Waan fiicanahay 😎 adigana?" });

      if (body.includes("yaa ku sameeyay"))
        return sock.sendMessage(from, { text: "🤖 Waxaa i sameeyay Shiiqaxmad" });

      return;
    }

    const cmd = body.replace("shiiq", "").trim();

    // 📜 MENU
    if (cmd === "menu") {
      return sock.sendMessage(from, {
        text: `
🤖 *SHIIQ ULTIMATE BOT*

👋 hi
⚡ ping
⏰ time
👑 owner
😂 joke
📊 status

👮 kick
🔇 mute
🔊 unmute

🎬 tiktok
🎧 song
🤖 ai
        `
      });
    }

    if (cmd === "hi") {
      return sock.sendMessage(from, { text: "👋 Salaam!" });
    }

    if (cmd === "ping") {
      return sock.sendMessage(from, { text: "⚡ Speed OK!" });
    }

    if (cmd === "time") {
      return sock.sendMessage(from, {
        text: new Date().toLocaleString()
      });
    }

    if (cmd === "owner") {
      return sock.sendMessage(from, { text: "👑 Shiiqaxmad" });
    }

    if (cmd === "joke") {
      return sock.sendMessage(from, {
        text: "😂 Bot ayaa yiri: 'Internet iga jooji markaan xanaaqo!'"
      });
    }

    if (cmd === "status") {
      return sock.sendMessage(from, { text: "📊 ONLINE 24/7 🚀" });
    }

    // 👮 GROUP ADMIN
    if (isGroup && cmd === "kick") {
      const user = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!user) return sock.sendMessage(from, { text: "Tag user!" });

      await sock.groupParticipantsUpdate(from, user, "remove");
    }

    if (cmd === "mute") {
      return sock.sendMessage(from, { text: "🔇 Group muted (demo)" });
    }

    if (cmd === "unmute") {
      return sock.sendMessage(from, { text: "🔊 Group unmuted (demo)" });
    }

    // 🎬 DOWNLOAD (demo)
    if (cmd.startsWith("tiktok")) {
      return sock.sendMessage(from, {
        text: "🎬 TikTok download (ku xiro API mustaqbalka)"
      });
    }

    if (cmd.startsWith("song")) {
      return sock.sendMessage(from, {
        text: "🎧 Song download (ku xiro API)"
      });
    }

    // 🤖 AI (simple)
    if (cmd.startsWith("ai")) {
      const q = cmd.replace("ai", "").trim();

      if (!q) {
        return sock.sendMessage(from, { text: "Qor su’aal 😄" });
      }

      return sock.sendMessage(from, {
        text: `🤖 Jawaab: "${q}" waa su’aal fiican! 😎`
      });
    }
  });
}

// 📲 PAIR
app.post("/pair", async (req, res) => {
  let number = req.body.number;

  if (!number) return res.send("❌ Number geli");

  number = number.replace(/[^0-9]/g, "");

  if (!number.startsWith("252")) {
    return res.send("❌ Format: 25261xxxxxxx");
  }

  try {
    if (!sock) {
      await startBot();

      await new Promise(resolve => {
        sock.ev.on("connection.update", (u) => {
          if (u.connection === "open") resolve();
        });
      });
    }

    const code = await sock.requestPairingCode(number);

    res.send(`
    <html>
    <body style="background:black;color:#00ff00;text-align:center;padding-top:100px;">
      <h1>${code}</h1>
    </body>
    </html>
    `);

  } catch {
    res.send("❌ Failed");
  }
});

// 📷 QR
app.get("/qr", async (req, res) => {
  if (!sock) {
    await startBot();
    await new Promise(r => setTimeout(r, 6000));
  }

  if (!qrImage) return res.send("⏳ Refresh");

  res.send(`<img src="${qrImage}" width="250">`);
});

// 🚀 SERVER
app.listen(PORT, () => {
  console.log("🚀 Ultimate Bot Running");
});
