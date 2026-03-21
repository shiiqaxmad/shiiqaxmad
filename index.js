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

// 📲 PAIR PAGE
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

    if (qr) {
      qrImage = await QRCode.toDataURL(qr);
    }

    if (connection === "open") {
      console.log("✅ CONNECTED");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        isStarted = false;
        startBot();
      }
    }
  });

  // 🤖 BOT LOGIC (UNCHANGED)
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

    if (!body.startsWith("shiiq")) {
      if (body.includes("sidee tahay"))
        return sock.sendMessage(from, { text: "Waan fiicanahay 😎 adigana?" });

      if (body.includes("yaa ku sameeyay"))
        return sock.sendMessage(from, { text: "🤖 Waxaa i sameeyay Shiiqaxmad" });

      return;
    }

    const cmd = body.replace("shiiq", "").trim();

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

    if (cmd === "hi") return sock.sendMessage(from, { text: "👋 Salaam!" });
    if (cmd === "ping") return sock.sendMessage(from, { text: "⚡ Speed OK!" });
    if (cmd === "time") return sock.sendMessage(from, { text: new Date().toLocaleString() });
    if (cmd === "owner") return sock.sendMessage(from, { text: "👑 Shiiqaxmad" });

    if (cmd === "joke") {
      return sock.sendMessage(from, {
        text: "😂 Bot ayaa yiri: 'Internet iga jooji markaan xanaaqo!'"
      });
    }

    if (cmd === "status") {
      return sock.sendMessage(from, { text: "📊 ONLINE 24/7 🚀" });
    }

    if (isGroup && cmd === "kick") {
      const user = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
      if (!user) return sock.sendMessage(from, { text: "Tag user!" });

      await sock.groupParticipantsUpdate(from, user, "remove");
    }

    if (cmd === "mute") return sock.sendMessage(from, { text: "🔇 Group muted (demo)" });
    if (cmd === "unmute") return sock.sendMessage(from, { text: "🔊 Group unmuted (demo)" });

    if (cmd.startsWith("tiktok")) {
      return sock.sendMessage(from, { text: "🎬 TikTok download (ku xiro API)" });
    }

    if (cmd.startsWith("song")) {
      return sock.sendMessage(from, { text: "🎧 Song download (ku xiro API)" });
    }

    if (cmd.startsWith("ai")) {
      const q = cmd.replace("ai", "").trim();
      if (!q) return sock.sendMessage(from, { text: "Qor su’aal 😄" });

      return sock.sendMessage(from, {
        text: `🤖 Jawaab: "${q}" waa su’aal fiican! 😎`
      });
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
    if (!sock) {
      await startBot();

      // 🔥 FIX: hal mar oo clean ah
      await new Promise(resolve => {
        const listener = (u) => {
          if (u.connection === "open") {
            sock.ev.off("connection.update", listener);
            resolve();
          }
        };
        sock.ev.on("connection.update", listener);
      });
    }

    const code = await sock.requestPairingCode(number);

    res.send(`
    <html>
    <body style="background:black;color:#00ff00;text-align:center;padding-top:100px;">
      <h2>✅ Pairing Code</h2>
      <h1 style="font-size:40px;">${code}</h1>
    </body>
    </html>
    `);

  } catch (err) {
    console.log(err);
    res.send("❌ Failed");
  }
});

// 📷 QR (FIXED UX)
app.get("/qr", async (req, res) => {
  if (!sock) {
    await startBot();
    await new Promise(r => setTimeout(r, 6000));
  }

  if (!qrImage) {
    return res.send(`
    <html>
    <body style="background:black;color:white;text-align:center;padding-top:100px;">
      <h2>⏳ Generating QR...</h2>
      <p>Refresh after 5 seconds</p>
    </body>
    </html>
    `);
  }

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
  console.log("🚀 Ultimate Bot Running");
});
