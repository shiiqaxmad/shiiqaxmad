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
    <h2>✅ Shiiq Bot is Running</h2>
    <a href="/pair">📲 PAIR NOW</a>
  `);
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

// 🚀 START BOT (HAL MAR OO KALIYA)
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
        console.log("🔄 Reconnecting...");
        isStarted = false;
        startBot();
      } else {
        console.log("❌ Logged out.");
      }
    }
  });

  // 💬 BOT COMMANDS
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

    // 📜 MENU
    if (cmd === "menu") {
      return sock.sendMessage(from, {
        text: `
📜 *SHIIQ BOT MENU*

👋 shiiq hi
⚡ shiiq ping
⏰ shiiq time
👑 shiiq owner
ℹ️ shiiq help
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
      const time = new Date().toLocaleString();
      return sock.sendMessage(from, { text: `⏰ ${time}` });
    }

    if (cmd === "owner") {
      return sock.sendMessage(from, {
        text: "👑 Owner: Shiiqaxmad"
      });
    }

    if (cmd === "help") {
      return sock.sendMessage(from, {
        text: "ℹ️ Isticmaal 'shiiq menu' si aad u aragto commands"
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
      <h2>✅ Pairing Code:</h2>
      <h1>${code}</h1>
      <p>Tag WhatsApp → Linked Devices → Link with phone number</p>
    `);
  } catch (err) {
    console.log(err);
    res.send("❌ Failed to generate code, try again!");
  }
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});
