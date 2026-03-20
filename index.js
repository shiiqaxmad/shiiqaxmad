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

// 🌐 HOME (DESIGN PRO)
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:linear-gradient(135deg,#141e30,#243b55);color:white;text-align:center;padding-top:150px;font-family:Arial;">
    <h1>🤖 Shiiq Bot</h1>
    <p>WhatsApp Bot Ready ✅</p>

    <a href="/pair" style="padding:12px 25px;background:#00ffcc;color:black;border-radius:10px;text-decoration:none;">
      📲 Pair Code
    </a>

    <br><br>

    <a href="/qr" style="padding:12px 25px;background:#00ffcc;color:black;border-radius:10px;text-decoration:none;">
      📷 Scan QR
    </a>
  </body>
  </html>
  `);
});

// 📲 PAIR PAGE (QURUX)
app.get("/pair", (req, res) => {
  res.send(`
  <html>
  <body style="background:linear-gradient(135deg,#1e3c72,#2a5298);color:white;text-align:center;padding-top:100px;font-family:Arial;">
    <h2>📲 Pair WhatsApp</h2>

    <form method="POST" action="/pair">
      <input name="number" placeholder="25261xxxxxxx" required 
      style="padding:12px;border-radius:10px;border:none;text-align:center;">
      <br><br>

      <button type="submit" 
      style="padding:12px 25px;background:#00ffcc;border:none;border-radius:10px;">
      GET CODE
      </button>
    </form>

    <br>
    <a href="/qr" style="color:#00ffcc;">📷 Use QR Instead</a>
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
    }

    if (connection === "open") {
      console.log("✅ BOT CONNECTED");
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

  // 🤖 BOT LOGIC (AUTO + COMMANDS)
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const body = text.toLowerCase();

    // ================= AUTO REPLY =================
    if (body.includes("sidee tahay")) {
      return sock.sendMessage(from, { text: "Waan fiicanahay 😊 adigana?" });
    }

    if (body.includes("maxaa kaa galay")) {
      return sock.sendMessage(from, { text: "Waxba ima gelin 😄" });
    }

    if (body.includes("yaa ku sameeyay")) {
      return sock.sendMessage(from, { text: "🤖 Waxaa i sameeyay Shiiqaxmad 👑" });
    }

    if (body.includes("mahadsanid")) {
      return sock.sendMessage(from, { text: "Adigaa mudan 🙌" });
    }

    // ================= COMMANDS =================
    if (!body.startsWith("shiiq")) return;

    const cmd = body.replace("shiiq", "").trim();

    if (cmd === "menu") {
      return sock.sendMessage(from, {
        text: `
🤖 SHIIQ BOT

👋 hi
⚡ ping
⏰ time
👑 owner
😂 joke
📊 status
        `
      });
    }

    if (cmd === "hi") {
      return sock.sendMessage(from, { text: "👋 Salaam!" });
    }

    if (cmd === "ping") {
      return sock.sendMessage(from, { text: "⚡ Bot is alive!" });
    }

    if (cmd === "time") {
      return sock.sendMessage(from, {
        text: new Date().toLocaleString()
      });
    }

    if (cmd === "owner") {
      return sock.sendMessage(from, {
        text: "👑 Shiiqaxmad"
      });
    }

    if (cmd === "joke") {
      return sock.sendMessage(from, {
        text: "😂 Bot ayaa hurday sababtoo ah bug badan ayuu qabay!"
      });
    }

    if (cmd === "status") {
      return sock.sendMessage(from, {
        text: "📊 Bot ONLINE ✅"
      });
    }
  });
}

// 📲 HANDLE PAIR
app.post("/pair", async (req, res) => {
  let number = req.body.number;
  if (!number) return res.send("❌ Number geli");

  number = number.replace(/[^0-9]/g, "");

  try {
    if (!sock) {
      await startBot();
      await new Promise(r => setTimeout(r, 5000));
    }

    const code = await sock.requestPairingCode(number);

    res.send(`
    <html>
    <body style="background:black;color:#00ff00;text-align:center;padding-top:100px;font-family:monospace;">
      <h2>✅ Pairing Code</h2>
      <h1 style="font-size:40px;">${code}</h1>
      <p>WhatsApp → Linked Devices → Link with phone number</p>
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
    await new Promise(r => setTimeout(r, 4000));
  }

  if (!qrImage) {
    return res.send("⏳ Refresh...");
  }

  res.send(`
  <html>
  <body style="background:#000;color:white;text-align:center;padding-top:50px;font-family:Arial;">
    <h2>📷 Scan QR</h2>
    <img src="${qrImage}" style="width:250px;border-radius:15px;" />
    <p>WhatsApp → Linked Devices → Scan QR</p>
  </body>
  </html>
  `);
});

// 🚀 SERVER
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
