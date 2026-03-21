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
  if (sock) {
    res.send("🟢 BOT STARTED");
  } else {
    res.send("🔴 BOT STOPPED");
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
      console.log("QR READY");
    }

    if (connection === "open") {
      console.log("CONNECTED ✅");
      qrImage = null;
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("DISCONNECTED:", code);

      if (code !== DisconnectReason.loggedOut) {
        isStarted = false;
        setTimeout(() => startBot(), 5000);
      }
    }
  });

  // 🤖 COMMANDS (SIDII AAD RABTAY)
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

    await new Promise(r => setTimeout(r, 700));

    if (t.includes("yaa sameeyay") || t.includes("owner")) {
      return sock.sendMessage(from, { text: "👑 Sheikh Axmad" });
    }

    if (t.includes("madaxey gangs mataqaan")) {
      return sock.sendMessage(from, { text: "❤️ Waa jacaylka Shiiq Axmad" });
    }

    if (t.includes("salaamay") || t.includes("hi")) {
      return sock.sendMessage(from, { text: "👋 Wcs bro" });
    }

    return sock.sendMessage(from, {
      text: "😎 Haa waa aniga Shiiq Bot"
    });
  });
}

// ⚡ PAIR (FIXED)
app.all("/pair", async (req, res) => {
  let number = req.body?.number || "";
  let code = "";

  if (number) {
    number = number.replace(/[^0-9]/g, "");

    if (number.startsWith("252")) {
      try {
        if (!sock) await startBot();

        // ❗ muhiim: sug yar oo kaliya, ha sugin sock.user
        await new Promise(r => setTimeout(r, 3000));

        code = await sock.requestPairingCode(number);

      } catch (err) {
        console.log("PAIR ERROR:", err);
        code = "❌ Try again";
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

  if (!qrImage) return res.send("❌ QR not ready");

  res.send(`<img src="${qrImage}" width="250"/>`);
});

// 🚀 SERVER
app.listen(PORT, async () => {
  console.log("RUNNING...");
  await startBot();
});
