global.crypto = require("node:crypto").webcrypto;

global.File = require("node:buffer").File;
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
});

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", (update) => {
  const { connection, lastDisconnect } = update;

  if (connection === "open") {
    console.log("✅ BOT READY");
  }

  if (connection === "close") {
    isStarted = false;
    if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      setTimeout(startBot, 4000);
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

    // 🔗 ANTILINK SYSTEM
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

    // PRESENCE
    if (cmd === "presence off") {
      presence = false;
      return sock.sendMessage(from,{ text:"🙈 Presence OFF" });
    }

    if (cmd === "presence on") {
      presence = true;
      return sock.sendMessage(from,{ text:"👀 Presence ON" });
    }

    // ANTILINK
    if (cmd === "antilink on") {
      antiLink = true;
      return sock.sendMessage(from,{ text:"🔗 AntiLink ON" });
    }

    if (cmd === "antilink off") {
      antiLink = false;
      return sock.sendMessage(from,{ text:"🔗 AntiLink OFF" });
    }

    // KICKALL
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

    // TAGALL
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

    // HIDETAG
    if (cmd === "hidetag") {
      const group = await sock.groupMetadata(from);
      const mentions = group.participants.map(p => p.id);

      return sock.sendMessage(from,{
        text:"👻 Hidden Tag",
        mentions
      });
    }

    // SONG
    if (cmd.startsWith("song")) {
      const query = text.slice(5).trim();
      const search = await yts(query);
      const vid = search.videos[0];

      if (!vid) return sock.sendMessage(from,{ text:"❌ Hees lama helin" });

      return sock.sendMessage(from,{
        text:`🎵 ${vid.title}\n${vid.url}`
      });
    }

    // VOICE
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

    // BASIC
    if (cmd === "madaxey" || cmd === "madaxey yaa waaye")
      return sock.sendMessage(from,{ text:"❤️ Shiiq Axmad jacayl" });

    if (cmd === "shiiq hoo biyo")
      return sock.sendMessage(from,{ text:"😂 Biyo ma hayo" });

    if (cmd === "hi" || cmd === "salaam")
      return sock.sendMessage(from,{ text:"👋 Wcs bro" });

    if (cmd === "joke")
      return sock.sendMessage(from,{ text:"😂 Noloshu waa meme!" });

    // QISADA
    if (cmd === "qisada 1") return sock.sendMessage(from,{text:"😢 Jacayl..."});
    if (cmd === "qisada 2") return sock.sendMessage(from,{text:"💔 Habeen..."});
    if (cmd === "qisada 3") return sock.sendMessage(from,{text:"😢 Xanuun..."});
    if (cmd === "qisada 4") return sock.sendMessage(from,{text:"💔 Aamus..."});
    if (cmd === "qisada 5") return sock.sendMessage(from,{text:"😢 Cashar..."});

    // GEERAAR
    if (cmd === "geeraar")
      return sock.sendMessage(from,{ text:"❤️ Adiga ayaan ku jeclahay..." });

    // MEME / ROAST
    if (cmd === "meme")
      return sock.sendMessage(from,{ text:"😂 Meme!" });

    if (cmd === "roast")
      return sock.sendMessage(from,{ text:"🤣 Update samee!" });

    // NUMBER
    if (cmd === "number")
      return sock.sendMessage(from,{ text:"🎲 " + Math.floor(Math.random()*100) });

    // VV
    if (cmd === "vv") {
      const quoted = msg.message.extendedTextMessage?.contextInfo;
      if (!quoted?.quotedMessage?.videoMessage)
        return sock.sendMessage(from,{ text:"Reply video" });

      const stream = await downloadContentFromMessage(
        quoted.quotedMessage.videoMessage,"video"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream)
        buffer = Buffer.concat([buffer, chunk]);

      return sock.sendMessage(from,{ video: buffer });
    }

    // IMG
    if (cmd === "img") {
      const quoted = msg.message.extendedTextMessage?.contextInfo;
      if (!quoted?.quotedMessage?.imageMessage)
        return sock.sendMessage(from,{ text:"Reply image" });

      const stream = await downloadContentFromMessage(
        quoted.quotedMessage.imageMessage,"image"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream)
        buffer = Buffer.concat([buffer, chunk]);

      return sock.sendMessage(from,{ image: buffer });
    }

    // MENU
    if (cmd === "menu" || cmd === "help") {
      return sock.sendMessage(from,{
        text:`🤖 SHIIQ BOT FULL

.hi
.joke
.geeraar
.qisada 1-5
.meme .roast
.number
.vv
.img
.tagall
.hidetag
.antilink on/off
.kickall
.presence on/off
.song magaca`
      });
    }

  } catch (e) {
    console.log(e);
  }
});

} catch (err) {
isStarted = false;
}
}

// 🌐 SERVER
app.get("/", (req, res) => {
res.send("BOT IS RUNNING ✅");
});

// 🔑 PAIR
app.get("/pair", async (req, res) => {
try {
  const number = req.query.number;
  if (!number) return res.send("Isticmaal: /pair?number=2526xxxx");

  const code = await sock.requestPairingCode(number);
  res.send(`<h2>PAIR CODE:</h2><h1>${code}</h1>`);

} catch (err) {
  res.send("Error: " + err.message);
}
});

app.listen(PORT, "0.0.0.0", async () => {
console.log("Server running on " + PORT);
await startBot();
});

// KEEP ALIVE
setInterval(() => console.log("Bot still alive..."), 30000);

// SELF PING
setInterval(async () => {
  try {
    await axios.get(process.env.KOYEB_URL);
    console.log("Self ping OK");
  } catch {
    console.log("Ping error");
  }
}, 60000);
