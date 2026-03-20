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

// 🌐 HOME
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:#000;color:#fff;text-align:center;padding-top:150px;">
    <h1>🤖 Shiiq Bot</h1>
    <a href="/pair" style="padding:10px 20px;background:#00ffcc;color:black;border-radius:10px;">PAIR NOW</a>
  </body>
  </html>
  `);
});

// 📲 PAIR PAGE
app.get("/pair", (req, res) => {
  res.send(`
  <html>
  <body style="background:#111;color:#fff;text-align:center;padding-top:100px;">
    <h2>📲 Pair WhatsApp</h2>
    <form method="POST" action="/pair">
      <input name="number" placeholder="25261xxxxxxx" required style="padding:10px;border-radius:10px;">
      <br><br>
      <button type="submit" style="padding:10px 20px;background:#00ffcc;border:none;border-radius:10px;">GET CODE</button>
    </form>
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
}

// 📲 HANDLE PAIR (FINAL FIX)
app.post("/pair", async (req, res) => {
  const number = req.body.number;
  if (!number) return res.send("❌ Number geli");

  try {
    if (!sock) {
      await startBot();
      await new Promise(r => setTimeout(r, 5000)); // 🔥 muhiim (5 sec)
    }

    const code = await sock.requestPairingCode(number);

    res.send(`
    <html>
    <body style="background:black;color:#00ff00;text-align:center;padding-top:100px;">
      <h2>✅ Pairing Code</h2>
      <h1 style="font-size:40px;">${code}</h1>
      <p>WhatsApp → Linked Devices → Link with phone number</p>
    </body>
    </html>
    `);

  } catch (err) {
    console.log(err);
    res.send("❌ Failed to generate code, try again!");
  }
});

// 🚀 SERVER
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
