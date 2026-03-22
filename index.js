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
      console.log("CONNECTED ✅");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("RECONNECTING...", code);

      if (code !== DisconnectReason.loggedOut) {
        isStarted = false;
        setTimeout(startBot, 5000);
      }
    }
  });

  // 🤖 COMMANDS (ALL IN ONE)
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const t = text.toLowerCase();

    if (!t.includes("shiiq bot")) return;

    await new Promise(r => setTimeout(r, 500));

    // 👑 owner
    if (t.includes("owner")) {
      return sock.sendMessage(from, { text: "👑 Sheikh Axmad" });
    }

    // ❤️ special
    if (t.includes("madaxey gangs mataqaan")) {
      return sock.sendMessage(from, { text: "❤️ Waa jacaylka Shiiq Axmad" });
    }

    // 👋 salaam
    if (t.includes("hi") || t.includes("salaam")) {
      return sock.sendMessage(from, { text: "👋 Wcs bro" });
    }

    // 😂 joke
    if (t.includes("joke")) {
      const jokes = [
        "😂 Wiil baa yiri bot i guurso… bot-na wuxuu yiri RAM ma haysto!",
        "🤣 Macalin baa yiri 2+2=5 ardaydii waxay tiri sir baa jirta!",
        "😆 Ninkii shaqo la'aan ahaa wuxuu noqday influencer!"
      ];
      return sock.sendMessage(from, { text: jokes[Math.floor(Math.random()*jokes.length)] });
    }

    // 🧠 time
    if (t.includes("time")) {
      return sock.sendMessage(from, { text: "🕒 " + new Date().toLocaleTimeString() });
    }

    // 📅 date
    if (t.includes("date")) {
      return sock.sendMessage(from, { text: "📅 " + new Date().toDateString() });
    }

    // 🔐 password
    if (t.includes("password")) {
      return sock.sendMessage(from, { text: "🔐 " + Math.random().toString(36).slice(-8) });
    }

    // 🏓 ping
    if (t.includes("ping")) {
      return sock.sendMessage(from, { text: "🏓 Pong! ⚡" });
    }

    // 😂 roast
    if (t.includes("roast")) {
      const roast = [
        "😂 RAM-kaaga waa 2MB!",
        "🤣 Maskaxdaadu update ayey rabtaa!",
        "😆 Bot baa kaa caqli badan!"
      ];
      return sock.sendMessage(from, { text: roast[Math.floor(Math.random()*roast.length)] });
    }

    // 🎮 game
    if (t.includes("ciyaar")) {
      const games = ["🏆 Guul!", "💀 Khasaaro!", "😎 Mar kale!"];
      return sock.sendMessage(from, { text: games[Math.floor(Math.random()*games.length)] });
    }

    // 📢 status
    if (t.includes("status")) {
      return sock.sendMessage(from, { text: "🟢 ONLINE 24/7 ⚡" });
    }

    // 📋 menu
    if (t.includes("help") || t.includes("menu")) {
      return sock.sendMessage(from, {
        text: `
🤖 SHIIQ BOT MENU

⚡ Basic: hi, owner  
😂 Fun: joke, roast  
🧠 Smart: time, date  
🔥 Pro: ping, password, ciyaar  

Enjoy 😎
`
      });
    }

    // default
    return sock.sendMessage(from, { text: "😎 Haa waa aniga Shiiq Bot" });
  });
}

// 🌐 UI (ERFAN STYLE)
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:#0d0d0d;color:white;text-align:center;padding-top:100px;font-family:sans-serif;">
    <h2>⚡ SHIIQ PAIR ⚡</h2>

    <form method="POST" action="/pair">
      <input name="number" placeholder="25261xxxxxxx" style="padding:10px;border-radius:10px;border:none;">
      <br><br>
      <button style="padding:10px 20px;border-radius:10px;background:#00ffcc;border:none;">GET CODE</button>
    </form>
  </body>
  </html>
  `);
});

// 🔑 PAIR
app.post("/pair", async (req, res) => {
  let number = req.body.number.replace(/[^0-9]/g, "");

  if (!number.startsWith("252")) {
    return res.send("❌ Invalid number");
  }

  try {
    if (!sock) await startBot();

    await new Promise(r => setTimeout(r, 3000));

    const code = await sock.requestPairingCode(number);

    res.send(`<h1 style="color:lime;text-align:center;">${code}</h1>`);

  } catch {
    res.send("❌ Try again");
  }
});

// 🚀 SERVER
app.listen(PORT, async () => {
  console.log("RUNNING...");
  await startBot();
});
