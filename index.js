const express = require("express");
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

// 🌐 HOME PAGE (DESIGN)
app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Shiiq Bot</title>
    <style>
      body {
        margin: 0;
        font-family: Arial;
        background: linear-gradient(135deg,#000,#0f2027,#2c5364);
        color: white;
        text-align: center;
      }
      .box {
        margin-top: 150px;
      }
      h1 {
        font-size: 30px;
      }
      a {
        display: inline-block;
        margin-top: 20px;
        padding: 12px 25px;
        background: #00ffcc;
        color: black;
        border-radius: 10px;
        text-decoration: none;
        font-weight: bold;
      }
      a:hover {
        background: #00cc99;
      }
    </style>
  </head>
  <body>

    <div class="box">
      <h1>🤖 Shiiq Bot is Running</h1>
      <p>WhatsApp Bot Ready ✅</p>
      <a href="/pair">📲 Pair Now</a>
    </div>

  </body>
  </html>
  `);
});

// 📲 PAIR PAGE (DESIGN)
app.get("/pair", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>Pair Device</title>
    <style>
      body {
        background: linear-gradient(135deg,#1e3c72,#2a5298);
        font-family: Arial;
        color: white;
        text-align: center;
        padding-top: 100px;
      }
      .card {
        background: #111;
        padding: 30px;
        border-radius: 15px;
        width: 300px;
        margin: auto;
      }
      input {
        width: 90%;
        padding: 10px;
        border-radius: 10px;
        border: none;
        margin-bottom: 15px;
      }
      button {
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        background: #00ffcc;
        color: black;
        font-weight: bold;
      }
    </style>
  </head>
  <body>

    <div class="card">
      <h2>📲 Pair WhatsApp</h2>
      <form method="POST" action="/pair">
        <input name="number" placeholder="25261xxxxxxx" required/>
        <br>
        <button type="submit">GET CODE</button>
      </form>
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
    browser: Browsers.macOS("Shiiq Bot")
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ BOT CONNECTED");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason !== DisconnectReason.loggedOut) {
        isStarted = false;
        startBot();
      }
    }
  });

  // 💬 COMMANDS
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const body = text.toLowerCase();

    // AUTO REPLY
    if (body === "hello") {
      return sock.sendMessage(from, { text: "👋 Hello!" });
    }

    if (!body.startsWith("shiiq")) return;

    const cmd = body.replace("shiiq", "").trim();

    if (cmd === "menu") {
      return sock.sendMessage(from, {
        text: `
📜 SHIIQ BOT

👋 hi
⚡ ping
⏰ time
👑 owner
        `
      });
    }

    if (cmd === "hi") {
      return sock.sendMessage(from, { text: "👋 Salaam!" });
    }

    if (cmd === "ping") {
      return sock.sendMessage(from, { text: "⚡ Alive!" });
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
  });
}

// 📲 HANDLE PAIR
app.post("/pair", async (req, res) => {
  const number = req.body.number;
  if (!number) return res.send("❌ Number geli");

  if (!sock) {
    await startBot();
  }

  try {
    const code = await sock.requestPairingCode(number);

    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          background: black;
          color: #00ff00;
          text-align: center;
          font-family: monospace;
          padding-top: 100px;
        }
        .code {
          font-size: 40px;
          letter-spacing: 5px;
        }
      </style>
    </head>
    <body>

      <h2>✅ Pairing Code</h2>
      <div class="code">${code}</div>
      <p>WhatsApp → Linked Devices → Link with phone number</p>

    </body>
    </html>
    `);

  } catch (err) {
    res.send("❌ Failed to generate code, try again!");
  }
});

// 🚀 SERVER
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
