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
      console.log("✅ BOT READY");
      isReady = true;
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("RECONNECTING...", code);

      isReady = false;

      if (code !== DisconnectReason.loggedOut) {
        isStarted = false;
        setTimeout(startBot, 5000);
      }
    }
  });

  // 👀 STATUS VIEW + REACT
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;

    // STATUS (story)
    if (from === "status@broadcast") {
      const emojis = ["❤️","🔥","😂","😢","😍","⚡","💯","😎"];

      await sock.sendMessage(from, {
        react: {
          text: emojis[Math.floor(Math.random()*emojis.length)],
          key: msg.key
        }
      });

      return; // stop here
    }

    // USER MESSAGES
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

    // 👋 salaam
    if (t.includes("hi") || t.includes("salaam")) {
      return sock.sendMessage(from, { text: "👋 Wcs bro" });
    }

    // 😂 joke
    if (t.includes("joke")) {
      const jokes = [
        "😂 Bot baa yiri RAM iga buuxsamay!",
        "🤣 Wiil baa yiri exam waan fududeynayaa!",
        "😆 Noloshu waa meme!"
      ];
      return sock.sendMessage(from, { text: jokes[Math.floor(Math.random()*jokes.length)] });
    }

    // 📋 menu
    if (t.includes("menu") || t.includes("help")) {
      return sock.sendMessage(from, {
        text: `
🤖 SHIIQ BOT MENU

⚡ Basic: hi, owner  
😂 Fun: joke  
😢 Qiso: shiiq qisada 1-10  
❤️ Geeraar: geeraar jacayl  

🔥 Status: auto view + react  

Enjoy 😎
`
      });
    }

    // 😢 QISOYIN
    if (t.includes("shiiq qisada")) {

      if (t.includes("1")) return sock.sendMessage(from,{text:`😢 QISO 1\n\nWiil ayaa jeclaa gabar… laakiin lama qadarin…\n\n💔 dadka qaar waxay kaa maqnaan karaan adigoon jirin`});
      if (t.includes("2")) return sock.sendMessage(from,{text:`😢 QISO 2\n\nGabar ayaa dooratay lacag… albaabku wuu xirnaa 😞`});
      if (t.includes("3")) return sock.sendMessage(from,{text:`😢 QISO 3\n\nQof aamusan ma faraxsana 💔`});
      if (t.includes("4")) return sock.sendMessage(from,{text:`😢 QISO 4\n\nHadal iyo ficil waa kala duwan 😢`});
      if (t.includes("5")) return sock.sendMessage(from,{text:`😢 QISO 5\n\nCabsi ayaa dilta jacaylka 😔`});
      if (t.includes("6")) return sock.sendMessage(from,{text:`😢 QISO 6\n\nQiimaha qofka waa la garan marka uu tago 😞`});
      if (t.includes("7")) return sock.sendMessage(from,{text:`😢 QISO 7\n\nDhoola cadeyn ma farxad 💔`});
      if (t.includes("8")) return sock.sendMessage(from,{text:`😢 QISO 8\n\nCiyaar jacayl dhaawac 😢`});
      if (t.includes("9")) return sock.sendMessage(from,{text:`😢 QISO 9\n\nAamusnaantu waa jawaab 😔`});
      if (t.includes("10")) return sock.sendMessage(from,{text:`😢 QISO 10\n\nDhammaadku waa aamusnaan 😞`});
    }

    // ❤️ GEERAAR
    if (t.includes("geeraar jacayl")) {
      const geeraar = [
`❤️ GEERAAR

Adiga ayaan ku jeclahay,
Qof kale ma arko.

Mucaashaq Shiiq Axmad`,

`❤️ GEERAAR

Indhahayga adaa iftiin,
Nolosheyda adaa micno.

Mucaashaq Shiiq Axmad`
      ];

      return sock.sendMessage(from, {
        text: geeraar[Math.floor(Math.random()*geeraar.length)]
      });
    }

    return sock.sendMessage(from, { text: "😎 Waa Shiiq Bot" });
  });
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
    if (!sock) await startBot();

    let tries = 0;
    while (!isReady && tries < 20) {
      await new Promise(r => setTimeout(r, 1000));
      tries++;
    }

    if (!isReady) return res.send("❌ Bot not ready");

    const code = await sock.requestPairingCode(number);

    res.send(`<h1 style="color:lime;text-align:center;">${code}</h1>`);

  } catch {
    res.send("❌ Failed");
  }
});

// 🚀 SERVER
app.listen(PORT, async () => {
  console.log("RUNNING...");
  await startBot();
});
