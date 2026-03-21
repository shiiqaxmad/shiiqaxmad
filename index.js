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
let isStarted = false;
let qrImage = null;

// 🔥 SYSTEM STATES
let statusMode = true;
let antiLink = true;
let muteGroup = false;

// 🌐 HOME (VPS TRICK)
app.get("/", (req, res) => {
  res.send("🤖 SHIIQ BOT RUNNING 24/7 ✅");
});

// 📲 PAIR
app.all("/pair", async (req, res) => {
  let code = "";
  let number = req.body?.number;

  if (number) {
    number = number.replace(/[^0-9]/g, "");

    if (!number.startsWith("252")) {
      code = "❌ Format: 25261xxxxxxx";
    } else {
      try {
        if (!sock) {
          await startBot();
          await new Promise(r => setTimeout(r, 10000));
        }

        code = await sock.requestPairingCode(number);

      } catch {
        code = "❌ Failed, try again!";
      }
    }
  }

  res.send(`
  <html>
  <body style="background:#111;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial;">
    <div style="width:100%;max-width:400px;text-align:center;">
      <h2>📲 Pair WhatsApp</h2>

      <form method="POST">
        <input name="number" placeholder="25261xxxxxxx" required 
        style="width:100%;padding:12px;border-radius:10px;text-align:center;border:none;margin-top:15px;">
        
        <button style="width:100%;margin-top:15px;padding:12px;background:#00ffcc;border:none;border-radius:10px;">
          GET CODE
        </button>
      </form>

      ${code ? `<h1 style="margin-top:20px;color:#00ff00;">${code}</h1>` : ""}

      <br>
      <a href="/qr" style="color:#00ffcc;">📷 Use QR Instead</a>
    </div>
  </body>
  </html>
  `);
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
    browser: Browsers.macOS("Shiiq Ultimate")
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;

    if (qr) qrImage = await QRCode.toDataURL(qr);

    if (connection === "open") console.log("✅ CONNECTED");

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        isStarted = false;
        startBot();
      }
    }
  });

  // 👋 WELCOME / GOODBYE
  sock.ev.on("group-participants.update", async (update) => {
    const { id, participants, action } = update;

    for (let user of participants) {
      if (action === "add") {
        await sock.sendMessage(id, {
          text: `👋 Soo dhawoow @${user.split("@")[0]}`,
          mentions: [user]
        });
      }

      if (action === "remove") {
        await sock.sendMessage(id, {
          text: `😢 Nabad galyo @${user.split("@")[0]}`,
          mentions: [user]
        });
      }
    }
  });

  // 🤖 MAIN LOGIC
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    const body = text.toLowerCase();

    // 🔥 STATUS
    if (from === "status@broadcast") {
      try {
        await sock.readMessages([msg.key]);

        if (statusMode) {
          await new Promise(r => setTimeout(r, 3000));
          await sock.sendMessage(
            msg.key.participant,
            { text: "hacker شيخ أحمد 🏴" },
            { quoted: msg }
          );
        }
      } catch {}
      return;
    }

    let participants, isAdmin, isBotAdmin;

    if (isGroup) {
      const group = await sock.groupMetadata(from);
      participants = group.participants;

      const sender = msg.key.participant;
      const botNumber = sock.user.id.split(":")[0] + "@s.whatsapp.net";

      isAdmin = participants.find(p => p.id === sender)?.admin;
      isBotAdmin = participants.find(p => p.id === botNumber)?.admin;
    }

    // 🔒 ANTI LINK
    if (isGroup && antiLink && body.includes("http")) {
      if (!isAdmin && isBotAdmin) {
        await sock.sendMessage(from, { delete: msg.key });
        await sock.sendMessage(from, { text: "🚫 Link lama ogola!" });
      }
    }

    // 🔇 MUTE
    if (isGroup && muteGroup && !isAdmin) {
      return sock.sendMessage(from, { delete: msg.key });
    }

    // 🔒 PREFIX
    if (!body.startsWith("shiiq")) return;
    const cmd = body.replace("shiiq", "").trim();

    // 💬 BASIC
    if (cmd === "hi") return sock.sendMessage(from, { text: "👋 Salaam!" });
    if (cmd === "ping") return sock.sendMessage(from, { text: "⚡ Alive!" });
    if (cmd === "owner") return sock.sendMessage(from, { text: "👑 Shiiqaxmad" });

    // 📲 STATUS CONTROL
    if (cmd === "status on") {
      statusMode = true;
      return sock.sendMessage(from, { text: "✅ Status ON" });
    }

    if (cmd === "status off") {
      statusMode = false;
      return sock.sendMessage(from, { text: "❌ Status OFF" });
    }

    // 👮 GROUP COMMANDS
    if (cmd === "kick" && isGroup) {
      if (!isAdmin) return;
      if (!isBotAdmin) return;

      const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
      if (mentioned) await sock.groupParticipantsUpdate(from, mentioned, "remove");
    }

    if (cmd === "tagall" && isGroup) {
      let teks = "📢 Tag All:\n\n";
      participants.forEach(p => {
        teks += `@${p.id.split("@")[0]}\n`;
      });

      await sock.sendMessage(from, {
        text: teks,
        mentions: participants.map(p => p.id)
      });
    }

    if (cmd === "mute" && isGroup) {
      if (!isAdmin) return;
      muteGroup = true;
      sock.sendMessage(from, { text: "🔇 Group muted" });
    }

    if (cmd === "unmute" && isGroup) {
      if (!isAdmin) return;
      muteGroup = false;
      sock.sendMessage(from, { text: "🔊 Group unmuted" });
    }

    if (cmd === "antilink on") {
      antiLink = true;
      sock.sendMessage(from, { text: "✅ Anti-link ON" });
    }

    if (cmd === "antilink off") {
      antiLink = false;
      sock.sendMessage(from, { text: "❌ Anti-link OFF" });
    }
  });
}

// 📷 QR
app.get("/qr", async (req, res) => {
  if (!sock) {
    await startBot();
    await new Promise(r => setTimeout(r, 8000));
  }

  if (!qrImage) return res.send("⏳ Refresh...");

  res.send(`
  <html>
  <body style="background:black;text-align:center;padding-top:50px;">
    <h2 style="color:white;">📷 Scan QR</h2>
    <img src="${qrImage}" width="250"/>
  </body>
  </html>
  `);
});

// 🚀 SERVER
app.listen(PORT, () => {
  console.log("🚀 SHIIQ BOT RUNNING");
}); 
