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
  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(number);

    console.log("📲 PAIR CODE:", code);

    if (res) {
      res.send(`
        <h2>✅ Pairing Code:</h2>
        <h1>${code}</h1>
        <p>Tag WhatsApp → Linked Devices → Link with code</p>
      `);
    }
  }

  // 🔌 CONNECTION UPDATE (AUTO RECONNECT)
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      console.log("✅ BOT CONNECTED");
    }

    if (connection === "close") {
      const reason = lastDisconnect?.error?.output?.statusCode;

      if (reason !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...");
        startBot(number); // restart
      } else {
        console.log("❌ Logged out. Scan again.");
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
    const args = cmd.split(" ");
    const action = args[0];

    // 👋 SALAAN
    if (cmd === "hi" || cmd === "hello") {
      return sock.sendMessage(from, { text: "👋 Salaam!" });
    }

    // 🤖 YAA SAMEEYAY
    if (cmd.includes("yaa ku sameeyay")) {
      return sock.sendMessage(from, {
        text: "🤖 Waxaa sameeyay Sheikh Axmad"
      });
    }

    // 📜 MENU
    if (cmd === "menu") {
      return sock.sendMessage(from, {
        text: `
📜 *SHIIQ BOT MENU*

shiiq hi
shiiq menu
shiiq time
shiiq ping
shiiq voice
shiiq remove (reply qof)
shiiq add 25261xxxx
shiiq promote (reply qof)
shiiq demote (reply qof)
shiiq close
shiiq open
        `
      });
    }

    // ⏰ TIME
    if (cmd === "time") {
      return sock.sendMessage(from, {
        text: "⏰ " + new Date().toLocaleString()
      });
    }

    // 🏓 PING
    if (cmd === "ping") {
      return sock.sendMessage(from, { text: "🏓 Pong!" });
    }

    // 🔊 VOICE
    if (cmd === "voice") {
      return sock.sendMessage(from, {
        audio: { url: "https://files.catbox.moe/8q3z8o.mp3" },
        mimetype: "audio/mp4",
        ptt: true
      });
    }

    // ❗ GROUP ONLY
    if (!from.endsWith("@g.us")) return;

    let target =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] ||
      msg.key.participant;

    // 🚫 REMOVE
    if (action === "remove") {
      await sock.groupParticipantsUpdate(from, [target], "remove");
      return sock.sendMessage(from, { text: "🚫 User removed" });
    }

    // ➕ ADD
    if (action === "add") {
      const number = args[1];
      if (!number)
        return sock.sendMessage(from, { text: "❌ Number geli");

      const jid = number + "@s.whatsapp.net";
      await sock.groupParticipantsUpdate(from, [jid], "add");
      return sock.sendMessage(from, { text: "✅ User added" });
    }

    // ⬆️ PROMOTE
    if (action === "promote") {
      await sock.groupParticipantsUpdate(from, [target], "promote");
      return sock.sendMessage(from, { text: "⬆️ Admin laga dhigay" });
    }

    // ⬇️ DEMOTE
    if (action === "demote") {
      await sock.groupParticipantsUpdate(from, [target], "demote");
      return sock.sendMessage(from, { text: "⬇️ Admin laga qaaday" });
    }

    // 🔒 CLOSE
    if (action === "close") {
      await sock.groupSettingUpdate(from, "announcement");
      return sock.sendMessage(from, { text: "🔒 Group closed" });
    }

    // 🔓 OPEN
    if (action === "open") {
      await sock.groupSettingUpdate(from, "not_announcement");
      return sock.sendMessage(from, { text: "🔓 Group opened" });
    }

    // 🤖 SMART
    if (cmd.includes("left")) {
      return sock.sendMessage(from, { text: "⬅️ Left la qaaday" });
    }

    if (cmd.includes("right")) {
      return sock.sendMessage(from, { text: "➡️ Right la qaaday" });
    }
  });
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
