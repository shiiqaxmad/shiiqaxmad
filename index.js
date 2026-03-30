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
let isConnected = false;

let antiLink = false;
let presence = true;
let recording = false;
let typing = true;

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
keepAliveIntervalMs: 15000,
});

sock.ev.on("creds.update", saveCreds);

// 🔌 CONNECTION
sock.ev.on("connection.update", (update) => {
const { connection, lastDisconnect } = update;

if (connection === "open") {
console.log("✅ BOT READY");
isConnected = true;
}

if (connection === "close") {
isConnected = false;
const reason = lastDisconnect?.error?.output?.statusCode;
console.log("❌ Closed:", reason);

isStarted = false;

if (reason !== DisconnectReason.loggedOut) {
setTimeout(startBot, 2000);
}
}
});

// 👀 STATUS VIEW + REACT
sock.ev.on("messages.upsert", async ({ messages }) => {
try {
const msg = messages[0];
if (!msg.message) return;

if (msg.key.remoteJid === "status@broadcast") {
await sock.readMessages([msg.key]);

const emojis = ["❤️","😂","🔥","😎","😍","🥰","😅","😳","👏","💯"];
const random = emojis[Math.floor(Math.random()*emojis.length)];

await sock.sendMessage("status@broadcast",{
react:{text:random,key:msg.key}
});
}

} catch(e){console.log(e)}
});

// 💬 COMMANDS
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
const admins = group.participants.filter(p=>p.admin).map(p=>p.id);

if (admins.includes(sender)) return;

await sock.sendMessage(from,{
delete:{remoteJid:from,id:msg.key.id,participant:sender}
});

await sock.groupParticipantsUpdate(from,[sender],"remove");

return sock.sendMessage(from,{text:"🚫 Link lama ogola!"});
}
}

if (!t.startsWith(".")) return;
const cmd = t.slice(1);

// 👀 PRESENCE
if (presence) {
if (typing) await sock.sendPresenceUpdate("composing", from);
if (recording) await sock.sendPresenceUpdate("recording", from);
}

// ⚙️ SETTINGS
if (cmd==="presence off") return presence=false,sock.sendMessage(from,{text:"🙈 OFF"});
if (cmd==="presence on") return presence=true,sock.sendMessage(from,{text:"👀 ON"});
if (cmd==="antilink on") return antiLink=true,sock.sendMessage(from,{text:"🔗 ON"});
if (cmd==="antilink off") return antiLink=false,sock.sendMessage(from,{text:"🔗 OFF"});
if (cmd==="typing on") return typing=true,sock.sendMessage(from,{text:"✍️ ON"});
if (cmd==="typing off") return typing=false,sock.sendMessage(from,{text:"✍️ OFF"});
if (cmd==="recording on") return recording=true,sock.sendMessage(from,{text:"🎙️ ON"});
if (cmd==="recording off") return recording=false,sock.sendMessage(from,{text:"🎙️ OFF"});

// 👥 GROUP
if (cmd==="kickall"){
if(!isGroup) return sock.sendMessage(from,{text:"❌ Group only"});

const sender = msg.key.participant || msg.key.remoteJid;
const group = await sock.groupMetadata(from);
const admins = group.participants.filter(p=>p.admin).map(p=>p.id);

if(!admins.includes(sock.user.id))
return sock.sendMessage(from,{text:"❌ Bot admin ma aha"});

if(!admins.includes(sender))
return sock.sendMessage(from,{text:"❌ Adiga admin ma tihid"});

const members = group.participants.map(p=>p.id).filter(id=>id!==sock.user.id);
await sock.groupParticipantsUpdate(from,members,"remove");

return sock.sendMessage(from,{text:"🔥 DONE"});
}

if (cmd==="tagall"){
const group = await sock.groupMetadata(from);
let teks="👥 TAG ALL\n\n";
let mentions=[];
for (let m of group.participants){
mentions.push(m.id);
teks+="@"+m.id.split("@")[0]+"\n";
}
return sock.sendMessage(from,{text:teks,mentions});
}

if (cmd==="hidetag"){
const group = await sock.groupMetadata(from);
const mentions = group.participants.map(p=>p.id);
return sock.sendMessage(from,{text:"👻 Hidden",mentions});
}

// 🎵 SONG
if (cmd.startsWith("song")){
const query = text.slice(5).trim();
const search = await yts(query);
const vid = search.videos[0];
if(!vid) return sock.sendMessage(from,{text:"❌ Not found"});
return sock.sendMessage(from,{text:`🎵 ${vid.title}\n${vid.url}`});
}

// 🎬 VV
if (cmd==="vv"){
const quoted = msg.message.extendedTextMessage?.contextInfo;
if(!quoted?.quotedMessage?.videoMessage)
return sock.sendMessage(from,{text:"Reply video"});

const stream = await downloadContentFromMessage(
quoted.quotedMessage.videoMessage,"video"
);

let buffer = Buffer.from([]);
for await (const chunk of stream)
buffer = Buffer.concat([buffer,chunk]);

return sock.sendMessage(from,{video:buffer});
}

// 🖼️ IMG
if (cmd==="img"){
const quoted = msg.message.extendedTextMessage?.contextInfo;
if(!quoted?.quotedMessage?.imageMessage)
return sock.sendMessage(from,{text:"Reply image"});

const stream = await downloadContentFromMessage(
quoted.quotedMessage.imageMessage,"image"
);

let buffer = Buffer.from([]);
for await (const chunk of stream)
buffer = Buffer.concat([buffer,chunk]);

return sock.sendMessage(from,{image:buffer});
}

// ❤️ BASIC + AUDIO
if(cmd==="hi"||cmd==="salaam") return sock.sendMessage(from,{text:"👋 Wcs bro"});
if(cmd==="joke") return sock.sendMessage(from,{text:"😂 Noloshu waa meme!"});
if(cmd==="madaxey") return sock.sendMessage(from,{text:"❤️ Shiiq Axmad"});
if(cmd==="madaxey yaa waaye") return sock.sendMessage(from,{text:"❤️ Waa Shiiq Axmad jacaylkiisa 💋🔥"});
if(cmd==="shiiq hoo biyo") return sock.sendMessage(from,{text:"😂 biyo ma hayo"});

if(cmd==="shiiq axmad maxaa rabtaa"){
return sock.sendMessage(from,{
audio:{url:"./AUD-20251226-WA0073.opus"},
mimetype:"audio/ogg; codecs=opus",
ptt:true
});
}

if(cmd==="heestii axmad"){
return sock.sendMessage(from,{
audio:{url:"./AUD-20260101-WA0120.mp3"},
mimetype:"audio/mp4",
ptt:true
});
}

// 📋 MENU
if(cmd==="menu"||cmd==="help"){
return sock.sendMessage(from,{text:`
🤖 SHIIQ BOT FULL 🔥

.hi
.joke
.madaxey
.madaxey yaa waaye
.shiiq axmad maxaa rabtaa
.heestii axmad

.vv
.img
.tagall
.hidetag
.kickall

.antilink on/off
.presence on/off
.typing on/off
.recording on/off

.song magaca
`});
}

return sock.sendMessage(from,{text:"😎 Unknown command"});

} catch(e){console.log(e)}
});

} catch(err){isStarted=false}
}

// 🌐 SERVER
app.get("/", (req,res)=>res.send("BOT RUNNING"));
app.get("/status",(req,res)=>res.send(isConnected?"READY":"NOT READY"));

// 🔥 NEW BEAUTIFUL PAIR PAGE
app.get("/pair",(req,res)=>{
res.send(`<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SHIIQ BOT</title>
<style>
body{display:flex;justify-content:center;align-items:center;height:100vh;background:#020617;color:white;font-family:sans-serif}
.box{background:#0f172a;padding:30px;border-radius:15px;text-align:center;width:90%;max-width:400px;box-shadow:0 0 20px #22c55e}
input{width:100%;padding:12px;margin-top:10px;border:none;border-radius:10px}
button{width:100%;padding:12px;margin-top:10px;background:#22c55e;border:none;border-radius:10px;color:white}
#code{margin-top:15px;font-size:22px;color:#22c55e}
</style>
</head>
<body>
<div class="box">
<h2>🤖 SHIIQ BOT</h2>
<input id="n" placeholder="25261xxxx">
<button onclick="g()">GET CODE</button>
<div id="c"></div>
</div>
<script>
async function g(){
let r=await fetch("/getcode?number="+n.value);
c.innerHTML=await r.text();
}
</script>
</body>
</html>`);
});

// 🔑 GET CODE
app.get("/getcode", async (req,res)=>{
try{
if(!sock||!isConnected) return res.send("❌ not ready");
const code=await sock.requestPairingCode(req.query.number);
res.send(code);
}catch(e){res.send("❌ "+e.message)}
});

app.listen(PORT, async ()=>{
console.log("RUNNING "+PORT);
await startBot();
});

setInterval(()=>console.log("alive"),30000);
setInterval(()=>{if(process.env.KOYEB_URL) axios.get(process.env.KOYEB_URL).catch(()=>{})},60000);
