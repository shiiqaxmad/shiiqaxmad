global.crypto = require("node:crypto").webcrypto;
global.File = require("node:buffer").File;

process.on("uncaughtException", (err) => {
  console.log("❌ Crash:", err.message);
});
process.on("unhandledRejection", (err) => {
  console.log("❌ Promise:", err);
});

const express = require("express");
const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
Browsers,
DisconnectReason,
downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const P = require("pino");
const yts = require("yt-search");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.urlencoded({ extended: true }));

let sock;
let isStarted = false;

// 🔗 ANTILINK
let antiLink = false;

// 👀 PRESENCE
let presence = true;

// 🚀 START BOT (PRO)
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
  keepAliveIntervalMs: 20000,
  connectTimeoutMs: 60000,
  defaultQueryTimeoutMs: 60000,
});

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", (update) => {
  const { connection, lastDisconnect } = update;

  if (connection === "open") {
    console.log("✅ BOT READY 24/7");
  }

  if (connection === "close") {
    const reason = lastDisconnect?.error?.output?.statusCode;
    console.log("❌ Closed:", reason);

    isStarted = false;

    if (reason !== DisconnectReason.loggedOut) {
      setTimeout(() => startBot(), 2000);
    } else {
      console.log("⚠️ Delete session kadib pair mar kale");
    }
  }
});

// 💬 COMMANDS (FULL)
sock.ev.on("messages.upsert", async ({ messages }) => {
  try {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith("@g.us");

    const text =
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      "";

    const t = text.toLowerCase();

    // 🔗 ANTILINK
    if (antiLink && isGroup) {
      if (text.includes("chat.whatsapp.com") || text.includes("https://")) {

        const sender = msg.key.participant || msg.key.remoteJid;
        const group = await sock.groupMetadata(from);
        const admins = group.participants.filter(p => p.admin).map(p => p.id);

        if (admins.includes(sender)) return;

        await sock.sendMessage(from,{
          delete:{
            remoteJid: from,
            id: msg.key.id,
            participant: sender
          }
        });

        await sock.groupParticipantsUpdate(from, [sender], "remove");

        return sock.sendMessage(from,{ text:"🚫 Link lama ogola!" });
      }
    }

    if (!t.startsWith(".")) return;
    const cmd = t.slice(1);

    // 👀 PRESENCE
    if (presence) {
      await sock.sendPresenceUpdate("composing", from);
      await new Promise(r => setTimeout(r, 500));
    }

    if (cmd === "presence off") {
      presence = false;
      return sock.sendMessage(from,{ text:"🙈 Presence OFF" });
    }

    if (cmd === "presence on") {
      presence = true;
      return sock.sendMessage(from,{ text:"👀 Presence ON" });
    }

    // 🔗 ANTILINK COMMAND
    if (cmd === "antilink on") {
      antiLink = true;
      return sock.sendMessage(from,{ text:"🔗 AntiLink ON" });
    }

    if (cmd === "antilink off") {
      antiLink = false;
      return sock.sendMessage(from,{ text:"🔗 AntiLink OFF" });
    }

    // 🔥 KICKALL
    if (cmd === "kickall") {
      if (!isGroup) return sock.sendMessage(from,{ text:"❌ Group only" });

      const sender = msg.key.participant || msg.key.remoteJid;
      const group = await sock.groupMetadata(from);
      const admins = group.participants.filter(p => p.admin).map(p => p.id);

      if (!admins.includes(sock.user.id))
        return sock.sendMessage(from,{ text:"❌ Bot admin ma aha" });

      if (!admins.includes(sender))
        return sock.sendMessage(from,{ text:"❌ Adiga admin ma tihid" });

      const members = group.participants.map(p => p.id);
      const targets = members.filter(id => id !== sock.user.id);

      await sock.groupParticipantsUpdate(from, targets, "remove");
      return sock.sendMessage(from,{ text:"🔥 Group la nadiifiyay" });
    }

    // 👥 TAGALL
    if (cmd === "tagall") {
      const group = await sock.groupMetadata(from);
      let teks = "👥 Tag All:\n\n";
      let mentions = [];

      for (let mem of group.participants) {
        mentions.push(mem.id);
        teks += "@" + mem.id.split("@")[0] + "\n";
      }

      return sock.sendMessage(from,{ text: teks, mentions });
    }

    // 👻 HIDETAG
    if (cmd === "hidetag") {
      const group = await sock.groupMetadata(from);
      const mentions = group.participants.map(p => p.id);

      return sock.sendMessage(from,{
        text:"👻 Hidden Tag",
        mentions
      });
    }

    // 🎵 SONG
    if (cmd.startsWith("song")) {
      const query = text.slice(5).trim();
      if (!query) return sock.sendMessage(from,{ text:"❗ Isticmaal: .song magaca" });

      const search = await yts(query);
      const vid = search.videos[0];

      if (!vid) return sock.sendMessage(from,{ text:"❌ Hees lama helin" });

      return sock.sendMessage(from,{
        text:`🎵 ${vid.title}\n${vid.url}`
      });
    }

    // 🎧 AUDIO
    if (cmd === "shiiq axmad maxaa rabtaa") {
      return sock.sendMessage(from,{
        audio: { url: "./AUD-20251226-WA0073.opus" },
        mimetype: "audio/ogg; codecs=opus",
        ptt: true
      });
    }

    if (cmd === "heestii axmad") {
      return sock.sendMessage(from,{
        audio: { url: "./AUD-20260101-WA0120.mp3" },
        mimetype: "audio/mp4",
        ptt: true
      });
    }

    // ❤️ BASIC
    if (cmd === "madaxey" || cmd === "madaxey yaa waaye")
      return sock.sendMessage(from,{ text:"❤️ Shiiq Axmad jacayl" });

    if (cmd === "shiiq hoo biyo")
      return sock.sendMessage(from,{ text:"😂 Biyo ma hayo" });

    if (cmd === "hi" || cmd === "salaam")
      return sock.sendMessage(from,{ text:"👋 Wcs bro" });

    if (cmd === "joke") {
      const jokes = [
        "😂 Bot baa yiri RAM iga buuxsamay!",
        "🤣 Wiil baa yiri exam waan fududeynayaa!",
        "😆 Noloshu waa meme!"
      ];
      return sock.sendMessage(from,{
        text:jokes[Math.floor(Math.random()*jokes.length)]
      });
    }

    // 📖 QISADA
    if (cmd === "qisada 1") return sock.sendMessage(from,{text:"😢 Wuxuu jeclaa qof aan isaga jeclayn..."});
    if (cmd === "qisada 2") return sock.sendMessage(from,{text:"💔 Habeen ayuu sugayay fariin..."});
    if (cmd === "qisada 3") return sock.sendMessage(from,{text:"😢 Jacayl ayaa noqday xanuun..."});
    if (cmd === "qisada 4") return sock.sendMessage(from,{text:"💔 Qalbigiisa ayaa aamusay..."});
    if (cmd === "qisada 5") return sock.sendMessage(from,{text:"😢 Mararka qaar jacayl waa cashar..."});

    // ❤️ GEERAAR
    if (cmd === "geeraar")
      return sock.sendMessage(from,{ text:"❤️ Adiga ayaan ku jeclahay...\n\nMucaashaq Shiiq Axmad" });

    // 😂 MEME / ROAST
    if (cmd === "meme")
      return sock.sendMessage(from,{ text:"😂 Noloshu waa meme!" });

    if (cmd === "roast") {
      const roast = ["😂 WiFi kuma aqoonsado!","🤣 update samee!"];
      return sock.sendMessage(from,{ text: roast[Math.floor(Math.random()*roast.length)] });
    }

    // 🎲 NUMBER
    if (cmd === "number")
      return sock.sendMessage(from,{ text:"🎲 " + Math.floor(Math.random()*100) });

    // 🎬 VV
    if (cmd === "vv") {
      const quoted = msg.message.extendedTextMessage?.contextInfo;
      if (!quoted?.quotedMessage?.videoMessage)
        return sock.sendMessage(from,{ text:"Reply video ku samee .vv" });

      const stream = await downloadContentFromMessage(
        quoted.quotedMessage.videoMessage,"video"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream)
        buffer = Buffer.concat([buffer, chunk]);

      return sock.sendMessage(from,{ video: buffer });
    }

    // 🖼️ IMG
    if (cmd === "img") {
      const quoted = msg.message.extendedTextMessage?.contextInfo;
      if (!quoted?.quotedMessage?.imageMessage)
        return sock.sendMessage(from,{ text:"Reply image ku samee .img" });

      const stream = await downloadContentFromMessage(
        quoted.quotedMessage.imageMessage,"image"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream)
        buffer = Buffer.concat([buffer, chunk]);

      return sock.sendMessage(from,{ image: buffer });
    }

    // 📋 MENU
    if (cmd === "menu" || cmd === "help") {
      return sock.sendMessage(from,{
        text:`🤖 SHIIQ BOT FULL

⚡ .hi
😂 .joke
❤️ .geeraar
😢 .qisada 1-5

🔥 .meme .roast
🎲 .number

🎬 .vv
🖼️ .img
👥 .tagall
👻 .hidetag

🔗 .antilink on/off
🔥 .kickall

👀 .presence on/off

🎵 .song magaca

❤️ .madaxey
😂 .shiiq hoo biyo
🎤 .shiiq axmad maxaa rabtaa
🎶 .heestii axmad`
      });
    }

    return sock.sendMessage(from,{ text:"😎 Amar lama garanayo" });

  } catch (e) {
    console.log(e);
  }
});

} catch (err) {
isStarted = false;
}
}

// 🌐 ROOT
app.get("/", (req, res) => {
res.send("BOT IS RUNNING ✅");
});

// 🔥 ULTRA PAIR PAGE
app.get("/pair", (req, res) => {
res.send(`
<!DOCTYPE html>
<html>
<head>
<title>SHIIQ BOT ULTRA</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
body{background:#020617;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh}
.box{background:#0f172a;padding:30px;border-radius:15px;text-align:center;width:90%;max-width:400px;box-shadow:0 0 20px #22c55e}
input{width:100%;padding:12px;margin-top:10px;border:none;border-radius:10px}
button{width:100%;padding:12px;margin-top:10px;background:#22c55e;border:none;border-radius:10px;color:white}
#code{margin-top:15px;font-size:22px;color:#22c55e}
</style>
</head>
<body>
<div class="box">
<h2>🤖 SHIIQ BOT</h2>
<input id="num" placeholder="25261XXXXXXX">
<button onclick="go()">GET CODE</button>
<div id="code"></div>
</div>
<script>
async function go(){
let n=document.getElementById("num").value;
let r=await fetch("/getcode?number="+n);
let t=await r.text();
document.getElementById("code").innerHTML=t;
navigator.clipboard.writeText(t);
}
</script>
</body>
</html>
`);
});

// 🔑 GET CODE
app.get("/getcode", async (req, res) => {
try {
if (!sock) return res.send("⏳ Bot starting...");
if (!sock.user) return res.send("❌ Bot not ready. Sug...");

const number = (req.query.number || "").replace(/[^0-9]/g, "");
if (!number) return res.send("❌ Number geli");

const code = await sock.requestPairingCode(number);
res.send("✅ CODE: " + code);

} catch (e) {
res.send("❌ Error: " + e.message);
}
});

app.listen(PORT, "0.0.0.0", async () => {
console.log("Server running on " + PORT);
await startBot();
});

// 🔥 KEEP ALIVE
setInterval(() => console.log("Bot still alive..."), 30000);

// 🔥 SELF PING
setInterval(async () => {
try {
if (process.env.KOYEB_URL) {
await axios.get(process.env.KOYEB_URL);
console.log("Self ping OK");
}
} catch {
console.log("Ping error");
}
}, 60000);
