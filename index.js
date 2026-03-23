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
    if (isStarted) return;
    isStarted = true;

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: P({ level: "silent" }),
      auth: state,
      browser: Browsers.macOS("Shiiq Bot"),
      printQRInTerminal: false
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

        isReady = false;
        isStarted = false;

        if (code !== DisconnectReason.loggedOut) {
          setTimeout(startBot, 4000);
        }
      }
    });

    // 💬 MESSAGES
    sock.ev.on("messages.upsert", async ({ messages }) => {
      try {
        const msg = messages[0];
        if (!msg.message) return;

        const from = msg.key.remoteJid;

        // 👀 STATUS REACT
        if (from === "status@broadcast") {
          const emojis = ["❤️","🔥","😂","😢","😍","⚡","💯","😎"];
          await sock.sendMessage(from, {
            react: {
              text: emojis[Math.floor(Math.random()*emojis.length)],
              key: msg.key
            }
          });
          return;
        }

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.imageMessage?.caption ||
          msg.message?.videoMessage?.caption ||
          "";

        const t = text.toLowerCase();

        if (!t.includes("shiiq")) return;

        await new Promise(r => setTimeout(r, 300));

        // 🤖 AUTO CHAT
        if (t === "shiiq bot") {
          const replies = [
            "😎 Haa waa aniga Shiiq Bot... maxaad rabtaa?",
            "🤖 Waan ku maqlayaa... hadal",
            "🔥 Halkan ayaan joogaa bro",
            "🧠 Waxaan dareemayaa su'aal kugu jirta"
          ];
          return sock.sendMessage(from,{
            text: replies[Math.floor(Math.random()*replies.length)]
          });
        }

        // ❤️ SPECIAL (MADAxEY)
        if (t.includes("madaxey") && t.includes("gangs")) {
          return sock.sendMessage(from,{
            text:"❤️ Waa Shiiq Axmad jacaylkiisa"
          });
        }

        // 😂 BIYO HOO
        if (t.includes("biyo hoo")) {
          return sock.sendMessage(from,{
            text:"War iga tag biyo marabee 😂"
          });
        }

        // 👑 OWNER
        if (t.includes("owner")) {
          return sock.sendMessage(from,{ text:"👑 Sheikh Axmad" });
        }

        // 👋 SALAAM
        if (t.includes("hi") || t.includes("salaam")) {
          return sock.sendMessage(from,{ text:"👋 Wcs bro" });
        }

        // 😂 JOKE
        if (t.includes("joke")) {
          const jokes = [
            "😂 Bot baa yiri RAM iga buuxsamay!",
            "🤣 Wiil baa yiri exam waan fududeynayaa!",
            "😆 Noloshu waa meme!"
          ];
          return sock.sendMessage(from,{
            text: jokes[Math.floor(Math.random()*jokes.length)]
          });
        }

        // 📋 MENU
        if (t.includes("menu") || t.includes("help")) {
          return sock.sendMessage(from,{
            text:`
🤖 SHIIQ BOT ULTRA

⚡ hi, owner  
😂 joke  
❤️ geeraar  
😢 qisada 1-5  

🔥 meme, roast, nasiib  
🔐 password, number  

😎 Type: shiiq bot
`
          });
        }

        // 📖 QISO
        if (t.includes("qisada 1")) return sock.sendMessage(from,{text:"😢 Wuxuu jeclaa qof aan isaga jeclayn..."});
        if (t.includes("qisada 2")) return sock.sendMessage(from,{text:"💔 Habeen ayuu sugayay fariin..."});
        if (t.includes("qisada 3")) return sock.sendMessage(from,{text:"😢 Jacayl ayaa noqday xanuun..."});
        if (t.includes("qisada 4")) return sock.sendMessage(from,{text:"💔 Qalbigiisa ayaa aamusay..."});
        if (t.includes("qisada 5")) return sock.sendMessage(from,{text:"😢 Mararka qaar jacayl waa cashar..."});

        // ❤️ LOVE
        if (t.includes("geeraar")) {
          return sock.sendMessage(from,{
            text:"❤️ Adiga ayaan ku jeclahay...\n\nMucaashaq Shiiq Axmad"
          });
        }

        if (t.includes("i love you")) {
          return sock.sendMessage(from,{text:"❤️ Waan ku jeclahay 😂"});
        }

        if (t.includes("waan murugaysanahay")) {
          return sock.sendMessage(from,{text:"💔 Waad ka gudbi doontaa..."});
        }

        // 😂 FUN
        if (t.includes("meme")) {
          return sock.sendMessage(from,{text:"😂 Noloshu waa meme!"});
        }

        if (t.includes("i caayi")) {
          const roast = ["😂 WiFi kuma aqoonsado!","🤣 update samee!"];
          return sock.sendMessage(from,{text:roast[Math.floor(Math.random()*roast.length)]});
        }

        // 🧠 SMART
        if (t.includes("fact")) {
          const facts = ["🧠 Maskaxdu waa yaab","🌍 Dunidu waa wareeg"];
          return sock.sendMessage(from,{text:facts[Math.floor(Math.random()*facts.length)]});
        }

        if (t.includes("runta ii sheeg")) {
          return sock.sendMessage(from,{text:"😈 Runta mar walba waa qaraar..."});
        }

        // 🎲 RANDOM
        if (t.includes("number")) {
          return sock.sendMessage(from,{text:"🎲 "+Math.floor(Math.random()*100)});
        }

        if (t.includes("password")) {
          return sock.sendMessage(from,{text:"🔐 "+Math.random().toString(36).slice(-8)});
        }

        if (t.includes("nasiib")) {
          const luck = ["🏆 Guul","💀 Khasaaro"];
          return sock.sendMessage(from,{text:luck[Math.floor(Math.random()*luck.length)]});
        }

        return sock.sendMessage(from,{text:"😎 Waa Shiiq Bot"});

      } catch (err) {
        console.log(err);
      }
    });

  } catch (err) {
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
      await new Promise(r => setTimeout(r, 4000));
    }

    let tries = 0;
    while (!isReady && tries < 30) {
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
  await startBot();
});
