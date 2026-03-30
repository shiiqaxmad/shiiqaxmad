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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

let sock;
let isStarted = false;
let isReady = false;

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
    isReady = false;
    isStarted = false;
    if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
      setTimeout(startBot, 4000);
    }
  }
});

// 💬 MESSAGES (COMMANDS KAMA TAABANIN)
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

    if (presence) {
      await sock.sendPresenceUpdate("composing", from);
      await new Promise(r => setTimeout(r, 800));
      await sock.sendPresenceUpdate("recording", from);
      await new Promise(r => setTimeout(r, 800));
    }

    if (cmd === "presence off") {
      presence = false;
      return sock.sendMessage(from,{ text:"🙈 Presence OFF" });
    }

    if (cmd === "presence on") {
      presence = true;
      return sock.sendMessage(from,{ text:"👀 Presence ON" });
    }

    if (cmd === "antilink on") {
      antiLink = true;
      return sock.sendMessage(from,{ text:"🔗 AntiLink ON" });
    }

    if (cmd === "antilink off") {
      antiLink = false;
      return sock.sendMessage(from,{ text:"🔗 AntiLink OFF" });
    }

    if (cmd === "kickall") {
      if (!isGroup) return sock.sendMessage(from,{ text:"❌ Group only" });

      const sender = msg.key.participant || msg.key.remoteJid;
      const group = await sock.groupMetadata(from);

      const admins = group.participants.filter(p => p.admin).map(p => p.id);

      if (!admins.includes(sock.user.id)) {
        return sock.sendMessage(from,{ text:"❌ Bot admin ma aha" });
      }

      if (!admins.includes(sender)) {
        return sock.sendMessage(from,{ text:"❌ Adiga admin ma tihid" });
      }

      const members = group.participants.map(p => p.id);
      const targets = members.filter(id => id !== sock.user.id);

      await sock.groupParticipantsUpdate(from, targets, "remove");

      return sock.sendMessage(from,{ text:"🔥 Group-ka dhan waa la nadiifiyay" });
    }

    if (cmd === "tagall") {
      if (!isGroup) return sock.sendMessage(from,{ text:"❌ Group only" });

      const group = await sock.groupMetadata(from);
      let teks = "👥 Tag All:\n\n";
      let mentions = [];

      for (let mem of group.participants) {
        mentions.push(mem.id);
        teks += "@" + mem.id.split("@")[0] + "\n";
      }

      return sock.sendMessage(from,{ text: teks, mentions });
    }

    if (cmd === "hidetag") {
      if (!isGroup) return sock.sendMessage(from,{ text:"❌ Group only" });

      const group = await sock.groupMetadata(from);
      const mentions = group.participants.map(p => p.id);

      return sock.sendMessage(from,{
        text:"👻 Hidden Tag",
        mentions
      });
    }

    if (cmd.startsWith("song")) {
      const query = text.slice(5).trim();
      if (!query) {
        return sock.sendMessage(from,{ text:"❗ Isticmaal: .song magaca heesta" });
      }

      const search = await yts(query);
      const vid = search.videos[0];

      if (!vid) return sock.sendMessage(from,{ text:"❌ Hees lama helin" });

      return sock.sendMessage(from,{
        text:`🎵 ${vid.title}\n\n🔗 ${vid.url}`
      });
    }

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

    if (cmd === "madaxey" || cmd === "madaxey yaa waaye") {
      return sock.sendMessage(from,{ text:"❤️ Shiiq Axmad jacaylkiisa waaye" });
    }

    if (cmd === "shiiq hoo biyo") {
      return sock.sendMessage(from,{ text:"😂 War iga tag biyo marabee" });
    }

    if (cmd === "hi" || cmd === "salaam") {
      return sock.sendMessage(from,{ text:"👋 Wcs bro" });
    }

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

    if (cmd === "qisada 1") return sock.sendMessage(from,{text:"😢 Wuxuu jeclaa qof aan isaga jeclayn..."});
    if (cmd === "qisada 2") return sock.sendMessage(from,{text:"💔 Habeen ayuu sugayay fariin..."});
    if (cmd === "qisada 3") return sock.sendMessage(from,{text:"😢 Jacayl ayaa noqday xanuun..."});
    if (cmd === "qisada 4") return sock.sendMessage(from,{text:"💔 Qalbigiisa ayaa aamusay..."});
    if (cmd === "qisada 5") return sock.sendMessage(from,{text:"😢 Mararka qaar jacayl waa cashar..."});

    if (cmd === "geeraar") {
      return sock.sendMessage(from,{
        text:"❤️ Adiga ayaan ku jeclahay...\n\nMucaashaq Shiiq Axmad"
      });
    }

    if (cmd === "meme") {
      return sock.sendMessage(from,{ text:"😂 Noloshu waa meme!" });
    }

    if (cmd === "roast") {
      const roast = ["😂 WiFi kuma aqoonsado!","🤣 update samee!"];
      return sock.sendMessage(from,{ text: roast[Math.floor(Math.random()*roast.length)] });
    }

    if (cmd === "number") {
      return sock.sendMessage(from,{ text:"🎲 " + Math.floor(Math.random()*100) });
    }

    if (cmd === "vv") {
      if (!msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage)
        return sock.sendMessage(from,{text:"Reply video ku samee .vv"});

      const quoted = msg.message.extendedTextMessage.contextInfo;
      const stream = await downloadContentFromMessage(
        quoted.quotedMessage.videoMessage,
        "video"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      return sock.sendMessage(from,{ video: buffer });
    }

    if (cmd === "img") {
      if (!msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage)
        return sock.sendMessage(from,{text:"Reply image ku samee .img"});

      const quoted = msg.message.extendedTextMessage.contextInfo;
      const stream = await downloadContentFromMessage(
        quoted.quotedMessage.imageMessage,
        "image"
      );

      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      return sock.sendMessage(from,{ image: buffer });
    }

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
❌ .del
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

  } catch (err) {
    console.log(err);
  }
});

} catch (err) {
isStarted = false;
}
}

// 🌐 SERVER
app.get("/", (req, res) => {
res.send("BOT IS RUNNING");
});

// 🔑 PAIR (FIXED ONLY)
app.get("/pair", async (req, res) => {
  if (!sock) return res.send("Bot starting...");
  const number = req.query.number;
  if (!number) return res.send("Isticmaal: /pair?number=2526xxxx");
  const code = await sock.requestPairingCode(number);
  res.send("PAIR CODE: " + code);
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log("Server running on " + PORT);
  await startBot();
});
