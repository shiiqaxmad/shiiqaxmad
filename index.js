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
let isReady = false;

// 🚀 START BOT
async function startBot() {
  try {
    if (isStarted && sock) return;
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
        console.log("✅ BOT READY");
        isReady = true;
      }

      if (connection === "close") {
        const code =
          lastDisconnect?.error?.output?.statusCode ||
          lastDisconnect?.error?.statusCode;

        console.log("❌ CLOSED:", code);

        isReady = false;
        isStarted = false;

        if (code !== DisconnectReason.loggedOut) {
          setTimeout(startBot, 5000);
        }
      }
    });

    // 💬 MESSAGES
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;

        // 👀 STATUS VIEW + REACT
        if (from === "status@broadcast") {
          const emojis = ["❤️","🔥","😂","😢","😍","⚡","💯","😎"];
          if (msg.key) {
            await sock.sendMessage(from, {
              react: {
                text: emojis[Math.floor(Math.random()*emojis.length)],
                key: msg.key
              }
            });
          }
          return;
        }

        // 🧠 TEXT
        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          "";

        const t = text.toLowerCase();

        if (!t.includes("shiiq")) return;

        await new Promise(r => setTimeout(r, 500));

        // 👑 OWNER
        if (t.includes("owner")) {
          return sock.sendMessage(from, { text: "👑 Sheikh Axmad" });
        }

        // 👋 SALAAM
        if (t.includes("hi") || t.includes("salaam")) {
          return sock.sendMessage(from, { text: "👋 Wcs bro" });
        }

        // 😂 JOKE
        if (t.includes("joke")) {
          const jokes = [
            "😂 Bot baa yiri RAM iga buuxsamay!",
            "🤣 Wiil baa yiri exam waan fududeynayaa!",
            "😆 Noloshu waa meme!"
          ];
          return sock.sendMessage(from, {
            text: jokes[Math.floor(Math.random()*jokes.length)]
          });
        }

        // 📋 MENU
        if (t.includes("menu") || t.includes("help")) {
          return sock.sendMessage(from, {
            text: `
🤖 SHIIQ BOT MENU

⚡ hi, owner  
😂 joke  
❤️ geeraar jacayl  
😢 shiiq qisada 1-10  
🔥 tiktok commands  

Enjoy 😎
`
          });
        }

        // 😢 QISOYIN
        if (t.includes("qisada")) {
          return sock.sendMessage(from, { text: "😢 Qisooyin waa murugo bro..." });
        }

        // ❤️ GEERAAR
        if (t.includes("geeraar")) {
          return sock.sendMessage(from, {
            text: `❤️ Adiga ayaan ku jeclahay,\nQof kale ma arko.\n\nMucaashaq Shiiq Axmad`
          });
        }

        // 💔 NEW COMMAND
        if (t.includes("caawa maxaa kugu dhacay")) {
          return sock.sendMessage(from, {
            text: "💔 Waa qalbi jabsanahay..."
          });
        }

        // 😂 TIKTOK FUN
        if (t.includes("biyaha hoo")) {
          return sock.sendMessage(from, { text: "War biyo marabee iga tag 😂" });
        }

        if (t.includes("lacag")) {
          return sock.sendMessage(from, { text: "Lacag? xitaa data ma haysto 😭" });
        }

        if (t.includes("imaaw")) {
          return sock.sendMessage(from, { text: "Meel ma imaan karo wifi ayaan ahay 😎" });
        }

        if (t.includes("seexo")) {
          return sock.sendMessage(from, { text: "Adaa seexo aniga shaqo ayaan hayaa 😂" });
        }

        if (t.includes("yaa tahay")) {
          return sock.sendMessage(from, {
            text: "Anigu waxaan ahay Shiiq Bot 😎🔥 kii dadka wareeriya 😂"
          });
        }

        return sock.sendMessage(from, { text: "😎 Waa Shiiq Bot" });

      } catch (err) {
        console.log("MSG ERROR:", err);
      }
    });

  } catch (err) {
    console.log("START ERROR:", err);
    isStarted = false;
  }
}

// 🌐 UI
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:black;color:white;text-align:center;padding-top:100px;">
    <h2>⚡ SHIIQ PAIR ⚡</h2>
    <form method="POST" action="/pair">
      <input name="number" placeholder="25261xxxxxxx" required>
      <br><br>
      <button>GET CODE</button>
    </form>
  </body>
  </html>
  `);
});

// 🔑 PAIR
app.post("/pair", async (req, res) => {
  let number = (req.body.number || "").replace(/[^0-9]/g, "");

  if (!number.startsWith("252")) {
    return res.send("❌ Invalid number");
  }

  try {
    if (!sock || !isReady) {
      await startBot();
    }

    let tries = 0;
    while (!isReady && tries < 40) {
      await new Promise(r => setTimeout(r, 1000));
      tries++;
    }

    if (!isReady) return res.send("❌ Bot not ready");

    const code = await sock.requestPairingCode(number);

    res.send(`<h1 style="color:lime;text-align:center;">${code}</h1>`);

  } catch (err) {
    res.send("❌ Failed");
  }
});

// 🚀 SERVER
app.listen(PORT, async () => {
  console.log("🚀 RUNNING...");
  await startBot();
});
