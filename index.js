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
  <body style="background:linear-gradient(135deg,#141e30,#243b55);color:white;text-align:center;padding-top:120px;font-family:Arial;">
    <h1>🤖 SHIIQ BOT PRO</h1>
    <p>Ultimate Version 🚀</p>

    <a href="/pair" style="display:block;margin:15px auto;width:200px;padding:12px;background:#00ffcc;color:black;border-radius:10px;text-decoration:none;">📲 Pairing</a>
    <a href="/qr" style="display:block;margin:15px auto;width:200px;padding:12px;background:#00ffcc;color:black;border-radius:10px;text-decoration:none;">📷 QR Code</a>
  </body>
  </html>
  `);
});

// 📲 PAIR (ONE PAGE SYSTEM)
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
          await new Promise(r => setTimeout(r, 8000));
        }

        code = await sock.requestPairingCode(number);

      } catch {
        code = "❌ Failed, try again!";
      }
    }
  }

  res.send(`
  <html>
  <body style="background:#111;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;">
    <div style="width:100%;max-width:400px;text-align:center;">
      <h2>📲 Pair WhatsApp</h2>

      <form method="POST">
        <input name="number" placeholder="25261xxxxxxx" required 
        style="width:100%;padding:12px;border-radius:10px;text-align:center;border:none;margin-top:15px;">
        
        <button style="width:100%;margin-top:15px;padding:12px;background:#00ffcc;border:none;border-radius:10px;">
          GET CODE
        </button>
      </form>

      ${code ? `<h1 style="margin-top:20px;color:#00ff00;">${code}</h1>` : ""}

      <br>
      <a href="/qr" style="color:#00ffcc;">📷 Use QR Instead</a>
    </div>
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

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const body = text.toLowerCase();

    if (!body.startsWith("shiiq")) return;

    const cmd = body.replace("shiiq", "").trim();

    if (cmd === "hi") return sock.sendMessage(from, { text: "👋 Salaam!" });
    if (cmd === "ping") return sock.sendMessage(from, { text: "⚡ Alive!" });
    if (cmd === "owner") return sock.sendMessage(from, { text: "👑 Shiiqaxmad" });
  });
}

// 📷 QR
app.get("/qr", async (req, res) => {
  if (!sock) {
    await startBot();
    await new Promise(r => setTimeout(r, 6000));
  }

  if (!qrImage) return res.send("⏳ Refresh...");

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
