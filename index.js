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

// ✅ SESSION FIX
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
      setTimeout(startBot, 2000);
    } else {
      console.log("⚠️ Delete session kadib pair mar kale");
    }
  }
});

// 💬 COMMANDS (FULL - NOTHING REMOVED)
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

await sock.groupParticipantsUpdate(from, [sender], "remove");

return sock.sendMessage(from,{ text:"🚫 Link lama ogola!" });
}
}

if (!t.startsWith(".")) return;
const cmd = t.slice(1);

// 👀 PRESENCE
if (presence) {
await sock.sendPresenceUpdate("composing", from);
await new Promise(r => setTimeout(r, 400));
}

// SETTINGS
if (cmd==="presence off") return presence=false, sock.sendMessage(from,{text:"🙈 OFF"});
if (cmd==="presence on") return presence=true, sock.sendMessage(from,{text:"👀 ON"});
if (cmd==="antilink on") return antiLink=true, sock.sendMessage(from,{text:"🔗 ON"});
if (cmd==="antilink off") return antiLink=false, sock.sendMessage(from,{text:"🔗 OFF"});

// GROUP
if (cmd==="kickall"){
if(!isGroup) return sock.sendMessage(from,{text:"❌ Group only"});
const sender=msg.key.participant||msg.key.remoteJid;
const group=await sock.groupMetadata(from);
const admins=group.participants.filter(p=>p.admin).map(p=>p.id);
if(!admins.includes(sock.user.id)) return sock.sendMessage(from,{text:"❌ Bot admin ma aha"});
if(!admins.includes(sender)) return sock.sendMessage(from,{text:"❌ Adiga admin ma tihid"});
const members=group.participants.map(p=>p.id);
await sock.groupParticipantsUpdate(from,members,"remove");
return sock.sendMessage(from,{text:"🔥 DONE"});
}

if (cmd==="tagall"){
const group=await sock.groupMetadata(from);
let teks="👥 TAG ALL\n\n"; let mentions=[];
for(let m of group.participants){
mentions.push(m.id);
teks+="@"+m.id.split("@")[0]+"\n";
}
return sock.sendMessage(from,{text:teks,mentions});
}

if (cmd==="hidetag"){
const group=await sock.groupMetadata(from);
const mentions=group.participants.map(p=>p.id);
return sock.sendMessage(from,{text:"👻 Hidden",mentions});
}

// SONG
if (cmd.startsWith("song")){
const query=text.slice(5).trim();
const search=await yts(query);
const vid=search.videos[0];
if(!vid) return sock.sendMessage(from,{text:"❌ Not found"});
return sock.sendMessage(from,{text:`🎵 ${vid.title}\n${vid.url}`});
}

// AUDIO
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

// VV
if (cmd==="vv"){
const quoted=msg.message.extendedTextMessage?.contextInfo;
if(!quoted?.quotedMessage?.videoMessage) return sock.sendMessage(from,{text:"Reply video"});
const stream=await downloadContentFromMessage(quoted.quotedMessage.videoMessage,"video");
let buffer=Buffer.from([]);
for await(const chunk of stream) buffer=Buffer.concat([buffer,chunk]);
return sock.sendMessage(from,{video:buffer});
}

// IMG
if (cmd==="img"){
const quoted=msg.message.extendedTextMessage?.contextInfo;
if(!quoted?.quotedMessage?.imageMessage) return sock.sendMessage(from,{text:"Reply image"});
const stream=await downloadContentFromMessage(quoted.quotedMessage.imageMessage,"image");
let buffer=Buffer.from([]);
for await(const chunk of stream) buffer=Buffer.concat([buffer,chunk]);
return sock.sendMessage(from,{image:buffer});
}

// BASIC
if (cmd==="hi"||cmd==="salaam") return sock.sendMessage(from,{text:"👋 Wcs"});
if (cmd==="joke") return sock.sendMessage(from,{text:"😂 Noloshu waa meme!"});
if (cmd==="madaxey yaa waaye") return sock.sendMessage(from,{text:"❤️ Shiiq Axmad jacaylkiisa waaye"});
if (cmd==="shiiq hoo biyo") return sock.sendMessage(from,{text:"war iga tag biyo marabee😭😂"});

// QISO
if (cmd==="qisada 1") return sock.sendMessage(from,{text:"😢 Jacayl..."});
if (cmd==="qisada 2") return sock.sendMessage(from,{text:"💔 Habeen..."});
if (cmd==="qisada 3") return sock.sendMessage(from,{text:"😢 Xanuun..."});
if (cmd==="qisada 4") return sock.sendMessage(from,{text:"💔 Aamus..."});
if (cmd==="qisada 5") return sock.sendMessage(from,{text:"😢 Cashar..."});

// GEERAAR
if (cmd==="geeraar") return sock.sendMessage(from,{text:"❤️ Adiga ayaan ku jeclahay..."});

// FUN
if (cmd==="meme") return sock.sendMessage(from,{text:"😂 Meme!"});
if (cmd==="roast") return sock.sendMessage(from,{text:"🤣 Update samee!"});
if (cmd==="number") return sock.sendMessage(from,{text:"🎲 "+Math.floor(Math.random()*100)});

// MENU
if (cmd==="menu"||cmd==="help"){
return sock.sendMessage(from,{text:`
🤖 SHIIQ BOT FULL
.hi .joke .geeraar
.qisada 1-5
.meme .roast
.number
.vv .img
.tagall .hidetag
.antilink on/off
.kickall
.presence on/off
.song magaca
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
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SHIIQ BOT</title>
</head>
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
status.innerHTML=t;
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

// 🔑 GET CODE (FIXED)
app.get("/getcode", async (req,res)=>{
try{
if(!sock) return res.send("⏳ Bot starting...");
if(!sock.user) return res.send("❌ Bot not ready, sug...");

const number = (req.query.number || "").replace(/[^0-9]/g,"");
if(!number) return res.send("❌ Number geli (25261...)");

// 🔥 muhiim: try/catch gudaha
let code;
try {
  code = await sock.requestPairingCode(number);
} catch (err) {
  return res.send("❌ Code error, isku day mar kale");
}

res.send("✅ CODE: " + code);

}catch(e){
res.send("❌ Error: " + e.message);
}
});


// 🚀 SERVER START (FIXED)
app.listen(PORT, "0.0.0.0", async ()=>{
console.log("RUNNING " + PORT);

// 🔥 muhiim: delay yar si sock u degto
setTimeout(() => {
  startBot();
}, 2000);

});
