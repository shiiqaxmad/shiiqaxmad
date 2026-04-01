global.crypto = require("node:crypto").webcrypto;
global.File = require("node:buffer").File;

process.on("uncaughtException", (err) => console.log("❌ Crash:", err.message));
process.on("unhandledRejection", (err) => console.log("❌ Promise:", err));

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

let antiLink = false;
let presence = true;

// 🚀 START BOT
async function startBot() {
try {
if (isStarted) return;
isStarted = true;

const { state, saveCreds } = await useMultiFileAuthState("./session2");
const { version } = await fetchLatestBaileysVersion();

sock = makeWASocket({
  version,
  logger: P({ level: "silent" }),
  auth: state,
  browser: Browsers.macOS("Shiiq Bot"),

  keepAliveIntervalMs: 10000,
  connectTimeoutMs: 60000,
  defaultQueryTimeoutMs: 60000,
  retryRequestDelayMs: 2000,
  markOnlineOnConnect: true,
});

sock.ev.on("creds.update", saveCreds);

// 🔥 CONNECTION FIX
sock.ev.on("connection.update", (update) => {
  const { connection, lastDisconnect } = update;

  if (connection === "open") {
    console.log("✅ BOT READY 100%");
  }

  if (connection === "close") {
    const reason = lastDisconnect?.error?.output?.statusCode;
    console.log("❌ Closed:", reason);

    isStarted = false;

    if (reason !== DisconnectReason.loggedOut) {
      setTimeout(startBot, 3000);
    } else {
      console.log("⚠️ Delete session kadib pair mar kale");
    }
  }
});

// 💬 COMMANDS FULL
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
delete:{ remoteJid: from, id: msg.key.id, participant: sender }
});

await sock.groupParticipantsUpdate(from,[sender],"remove");

return sock.sendMessage(from,{text:"🚫 Link lama ogola!"});
}
}

if (!t.startsWith(".")) return;
const cmd = t.slice(1);

// 🎤 typing + recording
await sock.sendPresenceUpdate("composing", from);
await new Promise(r => setTimeout(r, 300));
await sock.sendPresenceUpdate("recording", from);

// ⚙️ SETTINGS
if (cmd==="presence off") return presence=false, sock.sendMessage(from,{text:"🙈 OFF"});
if (cmd==="presence on") return presence=true, sock.sendMessage(from,{text:"👀 ON"});
if (cmd==="antilink on") return antiLink=true, sock.sendMessage(from,{text:"🔗 ON"});
if (cmd==="antilink off") return antiLink=false, sock.sendMessage(from,{text:"🔗 OFF"});

// 👋 BASIC
if (cmd==="hi"||cmd==="salaam") return sock.sendMessage(from,{text:"👋 Wcs"});
if (cmd==="ping") return sock.sendMessage(from,{text:"🏓 pong"});
if (cmd==="alive") return sock.sendMessage(from,{text:"✅ Bot Alive"});
if (cmd==="owner") return sock.sendMessage(from,{text:"👑 Shiiq Axmad"});

// ❤️ CUSTOM
if (cmd==="madaxey yaa waaye"){
return sock.sendMessage(from,{text:"❤️ Waa jacaylka Shiiq Axmad 😍"});
}

// 😂 FUN
if (cmd==="joke") return sock.sendMessage(from,{text:"😂 Noloshu waa meme!"});
if (cmd==="roast") return sock.sendMessage(from,{text:"🤣 Update samee!"});
if (cmd==="number") return sock.sendMessage(from,{text:"🎲 "+Math.floor(Math.random()*100)});

// 🎵 SONG
if (cmd.startsWith("song")){
const query=text.slice(5).trim();
const search=await yts(query);
const vid=search.videos[0];
if(!vid) return sock.sendMessage(from,{text:"❌ Not found"});
return sock.sendMessage(from,{text:`🎵 ${vid.title}\n${vid.url}`});
}

// 🎤 AUDIO
if (cmd==="shiiq axmad maxaa rabtaa"){
return sock.sendMessage(from,{
audio:{url:"./AUD-20251226-WA0073.opus"},
mimetype:"audio/ogg; codecs=opus",
ptt:true
});
}

if (cmd==="heestii axmad"){
return sock.sendMessage(from,{
audio:{url:"./AUD-20260101-WA0120.mp3"},
mimetype:"audio/mp4",
ptt:true
});
}

// 🎬 VV
if (cmd==="vv"){
const q=msg.message.extendedTextMessage?.contextInfo;
if(!q?.quotedMessage?.videoMessage) return sock.sendMessage(from,{text:"Reply video"});
const s=await downloadContentFromMessage(q.quotedMessage.videoMessage,"video");
let b=Buffer.from([]);
for await(const c of s) b=Buffer.concat([b,c]);
return sock.sendMessage(from,{video:b});
}

// 🖼 IMG
if (cmd==="img"){
const q=msg.message.extendedTextMessage?.contextInfo;
if(!q?.quotedMessage?.imageMessage) return sock.sendMessage(from,{text:"Reply image"});
const s=await downloadContentFromMessage(q.quotedMessage.imageMessage,"image");
let b=Buffer.from([]);
for await(const c of s) b=Buffer.concat([b,c]);
return sock.sendMessage(from,{image:b});
}

// 📜 MENU FULL
if (cmd==="menu"||cmd==="help"){
return sock.sendMessage(from,{text:`
╔═══〔 🤖 SHIIQ BOT 〕═══╗

👋 BASIC
.hi
.ping
.alive
.owner

❤️ CUSTOM
.madaxey yaa waaye

😂 FUN
.joke
.roast
.number

🎵 MEDIA
.song magaca
.heestii axmad
.shiiq axmad maxaa rabtaa

📥 DOWNLOAD
.vv
.img

👥 GROUP
.tagall
.hidetag
.kickall

⚙️ SETTINGS
.antilink on/off
.presence on/off

╚══════════════════════╝
`});
}

return sock.sendMessage(from,{text:"😎 Unknown command"});

}catch(e){console.log(e)}
});

} catch(err){isStarted=false}
}

// 🌐 ROUTES
app.get("/",(req,res)=>res.send("BOT RUNNING"));
app.get("/status",(req,res)=>res.send(sock?.user ? "READY" : "NOT READY"));

// 🔥 PAIR PAGE
app.get("/pair",(req,res)=>{
res.send(`
<!DOCTYPE html>
<html>
<body style="background:#020617;color:white;text-align:center">
<h2>🤖 SHIIQ BOT</h2>
<input id="num" placeholder="25261XXXXXXX">
<button onclick="g()">GET CODE</button>
<h3 id="status">...</h3>
<h3 id="code"></h3>

<script>
setInterval(async ()=>{
let r=await fetch("/status");
let t=await r.text();
status.innerHTML = t==="READY" ? "✅ READY" : "❌ NOT READY";
},2000);

async function g(){
let r=await fetch("/getcode?number="+num.value);
code.innerHTML=await r.text();
}
</script>

</body>
</html>
`);
});

// 🔑 GET CODE
app.get("/getcode", async (req,res)=>{
try{
if(!sock) return res.send("⏳ starting...");
if(!sock.user) return res.send("❌ bot not ready");

const number=(req.query.number||"").replace(/[^0-9]/g,"");
if(!number) return res.send("❌ number geli");

const code=await sock.requestPairingCode(number);
res.send("✅ "+code);

}catch(e){res.send("❌ "+e.message)}
});

// 🚀 SERVER
app.listen(PORT,"0.0.0.0",async ()=>{
console.log("RUNNING "+PORT);
setTimeout(startBot,2000);
});

// KEEP ALIVE
setInterval(()=>console.log("alive"),30000);

// SELF PING
setInterval(async ()=>{
try{
if(process.env.KOYEB_URL){
await axios.get(process.env.KOYEB_URL);
}
}catch{}
},60000);
