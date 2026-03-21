const express = require("express");
const QRCode = require("qrcode");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

let sock;
let qrImage = null;

// 🌐 HOME
app.get("/", (req, res) => {
  res.send(`
  <html>
  <body style="background:black;color:white;text-align:center;padding-top:100px;font-family:sans-serif;">
    <h1 style="color:#00ffcc;">⚡ SHIIQ BOT FINAL ⚡</h1>

    <a href="/pair">
      <button style="padding:15px 25px;background:#00ff00;border:none;border-radius:10px;">
        🔑 PAIR
      </button>
    </a>

    <br><br>

    <a href="/qr">
      <button style="padding:15px 25px;background:#00ccff;border:none;border-radius:10px;">
        📷 QR
      </button>
    </a>
  </body>
  </html>
  `);
});

// 🚀 START BOT
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    logger: P({ level: "silent" }),
    auth: state
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) {
      qrImage = await QRCode.toDataURL(qr);
      console.log("QR READY");
    }

    if (connection === "open") {
      console.log("✅ CONNECTED");
      qrImage = null;
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        console.log("🔄 RECONNECT...");
        setTimeout(startBot, 4000);
      }
    }
  });

  // 🤖 SIMPLE BOT
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    if (text.toLowerCase() === "hi") {
      await sock.sendMessage(from, { text: "👋 Hello!" });
    }
  });
}

// ⚡ PAIR (FIXED)
app.all("/pair", async (req, res) => {
  let number = req.body?.number || "";
  let code = "";

  if (number) {
    number = number.replace(/[^0-9]/g, "");

    if (!number.startsWith("252")) {
      code = "❌ Invalid number";
    } else {
      try {
        if (!sock) await startBot();

        // ✅ sug ilaa bot CONNECTED noqdo
        let tries = 0;
        while ((!sock || !sock.user) && tries < 20) {
          await new Promise(r => setTimeout(r, 1000));
          tries++;
        }

        if (!sock?.user) {
          code = "⏳ Bot starting... try again";
        } else {
          code = await sock.requestPairingCode(number);
        }

      } catch (err) {
        console.log("PAIR ERROR:", err);
        code = "❌ Try again";
      }
    }
  }

  res.send(`
  <html>
  <body style="background:#0f0f0f;color:white;text-align:center;padding-top:100px;">
    <h1>PAIR</h1>

    <form method="POST">
      <input name="number" placeholder="25261xxxxxxx" required
      style="padding:12px;border-radius:10px;text-align:center;border:none;">
      
      <br><br>
      <button style="padding:12px 20px;background:#00ffcc;border:none;border-radius:10px;">
        GET CODE
      </button>
    </form>

    ${code ? `<h2 style="color:#00ff00;">${code}</h2>` : ""}

    <br><br>
    <a href="/qr" style="color:#00ccff;">QR</a>
  </body>
  </html>
  `);
});

// 📷 QR
app.get("/qr", async (req, res) => {
  if (!sock) await startBot();

  let tries = 0;
  while (!qrImage && tries < 20) {
    await new Promise(r => setTimeout(r, 1000));
    tries++;
  }

  if (!qrImage) return res.send("❌ QR not ready");

  res.send(`<img src="${qrImage}" width="250"/>`);
});

// 🚀 SERVER
app.listen(PORT, async () => {
  console.log("🚀 RUNNING...");
  await startBot();
});
