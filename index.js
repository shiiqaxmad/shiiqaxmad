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

// 🛡️ CRASH PROTECTION
process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);

// 🌐 HOME
app.get("/", (req, res) => {
  res.send("🤖 SHIIQ BOT ACTIVE 24/7 ✅");
});

// 🚀 START BOT (ULTRA STABLE)
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
      console.log("📷 QR READY");
    }

    if (connection === "open") {
      console.log("✅ CONNECTED");
      qrImage = null;
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("🔄 RECONNECTING...");
        isStarted = false;
        setTimeout(() => startBot(), 3000);
      }
    }
  });

  // 🤖 SIMPLE BOT
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(from, { text: "👋 Salaam!" });
    }
  });
}

// ⚡ ULTRA PAIR
app.all("/pair", async (req, res) => {
  let code = "";
  let number = req.body?.number;

  if (number) {
    number = number.replace(/[^0-9]/g, "");

    if (!number.startsWith("252")) {
      code = "❌ Format: 25261xxxxxxx";
    } else {
      try {
        if (!sock) {
          await startBot();
        }

        let attempts = 0;
        while (!sock?.user && attempts < 10) {
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }

        if (!sock?.user) {
          code = "⏳ Bot starting... refresh kadib";
        } else {
          let success = false;
          let tries = 0;

          while (!success && tries < 3) {
            try {
              code = await sock.requestPairingCode(number);
              success = true;
            } catch {
              tries++;
              await new Promise(r => setTimeout(r, 1500));
            }
          }

          if (!success) {
            code = "❌ Failed, sug 20s kadib isku day";
          }
        }

      } catch (e) {
        console.log(e);
        code = "❌ Error dhacay";
      }
    }
  }

  res.send(`
  <html>
  <body style="background:#111;color:white;text-align:center;padding-top:100px;font-family:Arial;">
    <h2>⚡ SHIIQ ULTRA PAIR</h2>

    <form method="POST">
      <input name="number" placeholder="25261xxxxxxx" required
      style="padding:12px;border-radius:10px;text-align:center;border:none;">
      
      <br><br>
      <button style="padding:12px 20px;background:#00ffcc;border:none;border-radius:10px;">
        GET CODE ⚡
      </button>
    </form>

    ${code ? `<h1 style="margin-top:20px;color:#00ff00;">${code}</h1>` : ""}

    <br><br>
    <a href="/qr" style="color:#00ffcc;">📷 QR OPTION</a>
  </body>
  </html>
  `);
});

// 📷 QR (STABLE)
app.get("/qr", async (req, res) => {
  if (!sock) await startBot();

  let attempts = 0;

  while (!qrImage && attempts < 15) {
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
