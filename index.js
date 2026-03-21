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
  res.send("🤖 SHIIQ BOT PRO MAX ACTIVE 24/7 ✅");
});

// 🚀 START BOT (ANTI BAN + SMART)
async function startBot() {
  if (isStarted) return;
  isStarted = true;

  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state,
    browser: Browsers.macOS("Shiiq AntiBan")
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
        console.log("🔄 SMART RECONNECT...");
        isStarted = false;

        // 🧠 anti-ban delay (random)
        const delay = Math.floor(Math.random() * 5000) + 3000;

        setTimeout(() => {
          if (!isStarted) startBot();
        }, delay);
      } else {
        console.log("❌ Logged out - scan again");
      }
    }
  });

  // 🤖 BOT (ANTI BAN RESPONSE DELAY)
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    // 🧠 delay si ban looga fogaado
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(from, { text: "👋 Salaam!" });
    }
  });
}

// ⚡ SMART PAIR (ANTI BAN + RETRY)
app.all("/pair", async (req, res) => {
  let code = "";
  let number = req.body?.number;

  if (number) {
    number = number.replace(/[^0-9]/g, "");

    if (!number.startsWith("252")) {
      code = "❌ Format: 25261xxxxxxx";
    } else {
      try {
        if (!sock) await startBot();

        // 🧠 sug bot ready
        let attempts = 0;
        while (!sock?.user && attempts < 15) {
          await new Promise(r => setTimeout(r, 1000));
          attempts++;
        }

        if (!sock?.user) {
          code = "⏳ Bot starting... refresh";
        } else {
          let success = false;
          let tries = 0;

          while (!success && tries < 4) {
            try {
              code = await sock.requestPairingCode(number);
              success = true;
            } catch {
              tries++;

              // 🧠 anti-ban delay
              await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
            }
          }

          if (!success) {
            code = "❌ Try again after 30s";
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
    <h2>⚡ SHIIQ PRO MAX PAIR</h2>

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

// 📷 QR (SMART WAIT)
app.get("/qr", async (req, res) => {
  if (!sock) await startBot();

  let attempts = 0;

  while (!qrImage && attempts < 20) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  if (!qrImage) return res.send("❌ QR not ready");

  res.send(`
  <html>
  <body style="background:black;text-align:center;padding-top:50px;">
    <h2 style="color:white;">📷 Scan QR</h2>
    <img src="${qrImage}" width="250"/>
  </body>
  </html>
  `);
});

// 🚀 SERVER + AUTO START
app.listen(PORT, async () => {
  console.log("🚀 SHIIQ BOT PRO MAX RUNNING");

  // 🔥 AUTO START
  await startBot();
});
