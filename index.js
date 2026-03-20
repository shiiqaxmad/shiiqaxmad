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

// 🌐 HOME
app.get("/", (req, res) => {
  res.send(`<h2>✅ Shiiq Bot is Running</h2><a href="/pair">PAIR NOW</a>`);
});

// 📲 PAIR PAGE
app.get("/pair", (req, res) => {
  res.send(`
    <h2>📲 WhatsApp Pairing</h2>
    <form method="POST" action="/pair">
      <input name="number" placeholder="25261xxxxxxx" required/>
      <br><br>
      <button type="submit">GET CODE</button>
    </form>
  `);
});

// 🚀 START BOT
async function startBot(number, res) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: P({ level: "silent" }),
      auth: state,
      browser: Browsers.macOS("Shiiq Bot")
    });

    sock.ev.on("creds.update", saveCreds);

    // 📲 PAIR CODE
    if (!sock.authState.creds.registered && number) {
      try {
        const code = await sock.requestPairingCode(number);

        console.log("📲 PAIR CODE:", code);

        return res.send(`
          <h2>✅ Pairing Code:</h2>
          <h1>${code}</h1>
          <p>Tag WhatsApp → Linked Devices → Link with code</p>
        `);
      } catch (err) {
        console.log("❌ Pairing error:", err);
        return res.send("❌ Failed to generate code, try again!");
      }
    }

    // 🔌 CONNECTION UPDATE
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        console.log("✅ BOT CONNECTED");
      }

      if (connection === "close") {
        const reason = lastDisconnect?.error?.output?.statusCode;

        if (reason !== DisconnectReason.loggedOut) {
          console.log("🔄 Reconnecting...");
          startBot();
        } else {
          console.log("❌ Logged out.");
        }
      }
    });

    // 💬 BOT LOGIC
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

      if (cmd === "hi") {
        return sock.sendMessage(from, { text: "👋 Salaam!" });
      }
    });

  } catch (err) {
    console.log("❌ Bot start error:", err);
    return res.send("❌ Server error, try again!");
  }
}

// 📲 HANDLE PAIR
app.post("/pair", async (req, res) => {
  const number = req.body.number;
  if (!number) return res.send("❌ Number geli");

  await startBot(number, res);
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
