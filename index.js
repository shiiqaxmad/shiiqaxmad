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

// 🌐 HOME (PRO DESIGN)
app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Shiiq Bot</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;font-family:Arial}
      body{
        height:100vh;
        display:flex;
        justify-content:center;
        align-items:center;
        background:linear-gradient(135deg,#141e30,#243b55);
        color:white;
      }
      .container{
        width:100%;
        max-width:500px;
        padding:30px;
        text-align:center;
      }
      h1{font-size:32px;margin-bottom:10px}
      p{color:#bbb;margin-bottom:30px}
      .btn{
        display:block;
        width:100%;
        padding:15px;
        margin:10px 0;
        border-radius:12px;
        text-decoration:none;
        font-weight:bold;
        background:#00ffcc;
        color:black;
      }
      .btn:hover{background:#00cc99}
    </style>
  </head>
  <body>
    <div class="container">
      <h1>🤖 SHIIQ BOT PRO</h1>
      <p>Ultimate Version 🚀</p>

      <a href="/pair" class="btn">📲 Pairing Code</a>
      <a href="/qr" class="btn">📷 Scan QR Code</a>
    </div>
  </body>
  </html>
  `);
});

// 📲 PAIR PAGE (PRO DESIGN)
app.get("/pair", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <body style="background:#111;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;">
    <div style="width:100%;max-width:400px;text-align:center;">
      <h2>📲 Pair WhatsApp</h2>

      <form method="POST" action="/pair">
        <input name="number" placeholder="25261xxxxxxx" required 
        style="width:100%;padding:12px;border-radius:10px;text-align:center;border:none;margin-top:15px;">
        
        <button style="width:100%;margin-top:15px;padding:12px;background:#00ffcc;border:none;border-radius:10px;">
          GET CODE
        </button>
      </form>

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

  // 🤖 BOT LOGIC
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

    if (cmd === "menu") {
      return sock.sendMessage(from, {
        text: `🤖 SHIIQ BOT

👋 hi
⚡ ping
⏰ time
👑 owner`
      });
    }

    if (cmd === "hi") return sock.sendMessage(from, { text: "👋 Salaam!" });
    if (cmd === "ping") return sock.sendMessage(from, { text: "⚡ Alive!" });
    if (cmd === "time") return sock.sendMessage(from, { text: new Date().toLocaleString() });
    if (cmd === "owner") return sock.sendMessage(from, { text: "👑 Shiiqaxmad" });
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
      await new Promise(r => setTimeout(r, 8000));
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
    res.send("❌ Failed, try again!");
  }
});

// 📷 QR PAGE
app.get("/qr", async (req, res) => {
  if (!sock) {
    await startBot();
    await new Promise(r => setTimeout(r, 6000));
  }

  if (!qrImage) {
    return res.send("⏳ Refresh...");
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
  console.log("🚀 SHIIQ BOT RUNNING");
});
