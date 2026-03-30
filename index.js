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

// 💬 MESSAGES
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

    // 🔗 ANTILINK AUTO
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
      await new Promise(r => setTimeout(r, 800));
      await sock.sendPresenceUpdate("recording", from);
      await new Promise(r => setTimeout(r, 800));
    }

    // 👀 PRESENCE CONTROL
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

    // 🎧 VOICE
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

    // ❤️ madaxey
    if (cmd === "madaxey" || cmd === "madaxey yaa waaye") {
      return sock.sendMessage(from,{ text:"❤️ Shiiq Axmad jacaylkiisa waaye" });
    }

    // 😂 biyo
    if (cmd === "shiiq hoo biyo") {
      return sock.sendMessage(from,{ text:"😂 War iga tag biyo marabee" });
    }

    // 👋 hi
    if (cmd === "hi" || cmd === "salaam") {
      return sock.sendMessage(from,{ text:"👋 Wcs bro" });
    }

    // 😂 joke
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

    // 📖 qisada
    if (cmd === "qisada 1") return sock.sendMessage(from,{text:"😢 Wuxuu jeclaa qof aan isaga jeclayn..."});
    if (cmd === "qisada 2") return sock.sendMessage(from,{text:"💔 Habeen ayuu sugayay fariin..."});
    if (cmd === "qisada 3") return sock.sendMessage(from,{text:"😢 Jacayl ayaa noqday xanuun..."});
    if (cmd === "qisada 4") return sock.sendMessage(from,{text:"💔 Qalbigiisa ayaa aamusay..."});
    if (cmd === "qisada 5") return sock.sendMessage(from,{text:"😢 Mararka qaar jacayl waa cashar..."});

    // ❤️ geeraar
    if (cmd === "geeraar") {
      return sock.sendMessage(from,{
        text:"❤️ Adiga ayaan ku jeclahay...\n\nMucaashaq Shiiq Axmad"
      });
    }

    // 😂 meme
    if (cmd === "meme") {
      return sock.sendMessage(from,{text:"😂 Noloshu waa meme!"});
    }

    // 😈 roast
    if (cmd === "roast") {
      const roast = ["😂 WiFi kuma aqoonsado!","🤣 update samee!"];
      return sock.sendMessage(from,{text:roast[Math.floor(Math.random()*roast.length)]});
    }

    // 🎲 number
    if (cmd === "number") {
      return sock.sendMessage(from,{text:"🎲 "+Math.floor(Math.random()*100)});
    }

    // 🎬 VV FULL
    if (cmd === "vv") {

      if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage) {

        const quoted = msg.message.extendedTextMessage.contextInfo;

        const stream = await downloadContentFromMessage(
          quoted.quotedMessage.videoMessage,
          "video"
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
          buffer = Buffer.concat([buffer, chunk]);
        }

        return sock.sendMessage(from,{
          video: buffer,
          viewOnce: true,
          caption:"+252615810513 developer"
        });
      }

      return sock.sendMessage(from,{
        video: { url: "./vid.mp4" },
        viewOnce: true,
        caption:"+252615810513 developer"
      });
    }

    // 🖼️ IMG
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

    // 📋 MENU
    if (cmd === "menu" || cmd === "help") {
      return sock.sendMessage(from,{
        text:`
🤖 SHIIQ BOT FULL

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

❤️ .madaxey
😂 .shiiq hoo biyo
🎤 .shiiq axmad maxaa rabtaa
🎶 .heestii axmad
`
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

app.listen(PORT, async () => {
await startBot();
});
