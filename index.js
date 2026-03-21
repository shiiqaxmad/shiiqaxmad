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
let qrImage = null;
let isStarted = false;

// 🌐 HOME UI
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:black;color:white;text-align:center;padding-top:100px;font-family:sans-serif;">
    <h1 style="color:#00ffcc;">⚡ SHIIQ BOT ⚡</h1>

    <br>

    <a href="/pair">
      <button style="padding:15px 25px;background:#00ff00;border:none;border-radius:10px;">
        PAIR
      </button>
    </a>

    <br><br>

    <a href="/qr">
      <button style="padding:15px 25px;background:#00ccff;border:none;border-radius:10px;">
        QR
      </button>
    </a>
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
    browser: Browsers.macOS("Shiiq Bot")
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
      qrImage = null;
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 RECONNECT...");
        isStarted = false;
        setTimeout(() => startBot(), 4000);
      }
    }
  });

  // 🤖 BOT (ONLY TRIGGER: "shiiq bot")
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const t = text.toLowerCase();

    // ❌ haddii magaca la sheegin → ha jawaabin
    if (!t.includes("shiiq bot")) return;

    // 🧠 delay natural
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1000));

    // 😂 random replies
    const replies = [
      "😎 Haa waa aniga, maxaa rabtaa?",
      "🤖 Waan joogaa!",
      "👀 Waan ku maqlayaa...",
      "🔥 Shiiq Bot online!",
      "😄 Maxaan kuu qabtaa?"
    ];

    const random = () => replies[Math.floor(Math.random() * replies.length)];

    // 👑 owner
    if (t.includes("yaa sameeyay") || t.includes("owner")) {
      return await sock.sendMessage(from, {
        text: "👑 Sheikh Axmad"
      });
    }

    // ❤️ special
    if (t.includes("madaxey gangs mataqaan")) {
      return await sock.sendMessage(from, {
        text: "❤️ Waa jacaylka Shiiq Axmad"
      });
    }

    // 🔥 default
    return await sock.sendMessage(from, {
      text: random()
    });
  });
}

// ⚡ PAIRING (EASY)
app.all("/pair", async (req, res) => {
  let number = req.body?.number || "";
  let code = "";

  if (number) {
    number = number.replace(/[^0-9]/g, "");

    if (number.startsWith("252")) {
      try {
        if (!sock) await startBot();

        // sug yar (hidden)
        for (let i = 0; i < 15; i++) {
          if (sock?.user) break;
          await new Promise(r => setTimeout(r, 1000));
        }

        try {
          code = await sock.requestPairingCode(number);
        } catch (err) {
          console.log("PAIR ERROR:", err);
          code = "❌ Try again";
        }

      } catch {
        code = "❌ Error";
      }
    } else {
      code = "❌ Invalid number";
    }
  }

  res.send(`
  <html>
  <body style="background:#0f0f0f;color:white;text-align:center;padding-top:100px;font-family:sans-serif;">
    <h1 style="color:#00ffcc;">PAIR</h1>

    <form method="POST">
      <input name="number" placeholder="25261xxxxxxx" required
      style="padding:12px;border-radius:10px;text-align:center;border:none;">
      
      <br><br>
      <button style="padding:12px 20px;background:#00ffcc;border:none;border-radius:10px;">
        GET CODE
      </button>
    </form>

    ${code ? `<h1 style="margin-top:20px;color:#00ff00;">${code}</h1>` : ""}

    <br><br>
    <a href="/qr" style="color:#00ccff;">QR</a>
  </body>
  </html>
  `);
});

// 📷 QR
app.get("/qr", async (req, res) => {
  if (!sock) await startBot();

  let attempts = 0;
  while (!qrImage && attempts < 20) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  if (!qrImage) return res.send("❌");

  res.send(`
  <html>
  <body style="background:black;text-align:center;padding-top:50px;">
    <img src="${qrImage}" width="250"/>
  </body>
  </html>
  `);
});

// 🚀 SERVER
app.listen(PORT, async () => {
  console.log("🚀 SHIIQ BOT RUNNING");
  await startBot();
});
