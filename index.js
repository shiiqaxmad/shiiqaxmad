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
let qrImage = null;
let isStarted = false;

// 🌐 HOME
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:black;color:white;text-align:center;padding-top:100px;">
    <h1>⚡ SHIIQ BOT ⚡</h1>

    <a href="/status"><button>STATUS</button></a>
    <br><br>

    <a href="/pair"><button>PAIR</button></a>
    <br><br>

    <a href="/qr"><button>QR</button></a>
  </body>
  </html>
  `);
});

// ✅ STATUS
app.get("/status", (req, res) => {
  if (sock?.user) {
    res.send("✅ READY");
  } else {
    res.send("⏳ NOT READY");
  }
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
      qrImage = null;
      console.log("CONNECTED");
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        isStarted = false;
        setTimeout(() => startBot(), 4000);
      }
    }
  });

  // 🤖 COMMANDS (ONLY WHEN "shiiq bot" LA SHEEGO)
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const t = text.toLowerCase();

    // ❗ magaca waa in la sheego
    if (!t.includes("shiiq bot")) return;

    await new Promise(r => setTimeout(r, 700));

    // 👑 owner
    if (t.includes("yaa sameeyay") || t.includes("owner")) {
      return sock.sendMessage(from, {
        text: "👑 Sheikh Axmad"
      });
    }

    // ❤️ madaxey gangs
    if (t.includes("madaxey gangs mataqaan")) {
      return sock.sendMessage(from, {
        text: "❤️ Waa jacaylka Shiiq Axmad"
      });
    }

    // 😂 salaam
    if (t.includes("salaamay") || t.includes("hi")) {
      return sock.sendMessage(from, {
        text: "👋 Wcs bro"
      });
    }

    // 😎 default reply
    return sock.sendMessage(from, {
      text: "😎 Haa waa aniga Shiiq Bot"
    });
  });
}

// ⚡ PAIR
app.all("/pair", async (req, res) => {
  let number = req.body?.number || "";
  let code = "";

  if (number) {
    number = number.replace(/[^0-9]/g, "");

    if (number.startsWith("252")) {
      try {
        if (!sock) await startBot();

        let ready = false;
        for (let i = 0; i < 25; i++) {
          if (sock?.user) {
            ready = true;
            break;
          }
          await new Promise(r => setTimeout(r, 1000));
        }

        if (!ready) {
          code = "⏳ Sug yar...";
        } else {
          code = await sock.requestPairingCode(number);
        }

      } catch {
        code = "❌ Failed";
      }
    } else {
      code = "❌ Invalid number";
    }
  }

  res.send(`
  <html>
  <body style="background:black;color:white;text-align:center;padding-top:100px;">
    <h1>PAIR</h1>

    <form method="POST">
      <input name="number" placeholder="25261xxxxxxx" required>
      <br><br>
      <button>GET CODE</button>
    </form>

    ${code ? `<h2>${code}</h2>` : ""}
  </body>
  </html>
  `);
});

// 📷 QR
app.get("/qr", async (req, res) => {
  if (!sock) await startBot();

  let attempts = 0;
  while (!qrImage && attempts < 20) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  if (!qrImage) return res.send("❌");

  res.send(`<img src="${qrImage}" width="250"/>`);
});

// 🚀 SERVER
app.listen(PORT, async () => {
  console.log("RUNNING...");
  await startBot();
});
