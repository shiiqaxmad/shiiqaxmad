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

const app = express();
const PORT = process.env.PORT || 8000;

let sock;
let isStarted = false;

let antiLink = false;
let presence = true;
let autoReact = false;
let users = {};

// ================= START BOT =================
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
markOnlineOnConnect: true,
});

sock.ev.on("creds.update", saveCreds);

// CONNECTION FIX
sock.ev.on("connection.update", (update) => {
const { connection, lastDisconnect } = update;

if (connection === "open") console.log("✅ BOT READY");

if (connection === "close") {
const reason = lastDisconnect?.error?.output?.statusCode;
console.log("❌ Closed:", reason);

isStarted = false;

// auto reconnect
setTimeout(startBot, 3000);
}
});

// ================= COMMANDS =================
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

// PRESENCE
if (presence) {
await sock.sendPresenceUpdate("composing", from);
await new Promise(r => setTimeout(r, 200));
await sock.sendPresenceUpdate("recording", from);
}

// AUTO REACT
if (autoReact) {
await sock.sendMessage(from,{
react:{ text:"❤️", key: msg.key }
});
}

// USERS
if (!users[from]) users[from] = { money: 100 };

// ANTILINK
if (antiLink && isGroup && text.includes("https://")) {
const sender = msg.key.participant || msg.key.remoteJid;
await sock.groupParticipantsUpdate(from, [sender], "remove");
return sock.sendMessage(from,{text:"🚫 Link lama ogola"});
}

// COMMAND
if (!t.startsWith(".")) return;
const cmd = t.slice(1);

// SETTINGS
if (cmd==="presence on") return presence=true, sock.sendMessage(from,{text:"👀 ON"});
if (cmd==="presence off") return presence=false, sock.sendMessage(from,{text:"🙈 OFF"});
if (cmd==="antilink on") return antiLink=true, sock.sendMessage(from,{text:"🔗 ON"});
if (cmd==="antilink off") return antiLink=false, sock.sendMessage(from,{text:"🔗 OFF"});
if (cmd==="autoreact on") return autoReact=true, sock.sendMessage(from,{text:"❤️ ON"});
if (cmd==="autoreact off") return autoReact=false, sock.sendMessage(from,{text:"💔 OFF"});

// GROUP
if (cmd==="tagall"){
const group=await sock.groupMetadata(from);
let teks="👥 TAG ALL\n\n"; let mentions=[];
for(let m of group.participants){
mentions.push(m.id);
teks+="@"+m.id.split("@")[0]+"\n";
}
return sock.sendMessage(from,{text:teks,mentions});
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

// CUSTOM
if (cmd==="madaxey yaa waaye"){
return sock.sendMessage(from,{text:"❤️ Waa jacaylka Shiiq Axmad"});
}

// MEDIA
if (cmd==="vv"){
const quoted=msg.message.extendedTextMessage?.contextInfo;
if(!quoted?.quotedMessage?.videoMessage) return sock.sendMessage(from,{text:"Reply video"});
const stream=await downloadContentFromMessage(quoted.quotedMessage.videoMessage,"video");
let buffer=Buffer.from([]);
for await(const chunk of stream) buffer=Buffer.concat([buffer,chunk]);
return sock.sendMessage(from,{video:buffer});
}

if (cmd==="img"){
const quoted=msg.message.extendedTextMessage?.contextInfo;
if(!quoted?.quotedMessage?.imageMessage) return sock.sendMessage(from,{text:"Reply image"});
const stream=await downloadContentFromMessage(quoted.quotedMessage.imageMessage,"image");
let buffer=Buffer.from([]);
for await(const chunk of stream) buffer=Buffer.concat([buffer,chunk]);
return sock.sendMessage(from,{image:buffer});
}

// FUN
if (cmd==="hi") return sock.sendMessage(from,{text:"👋 Wcs"});
if (cmd==="joke") return sock.sendMessage(from,{text:"😂 Noloshu waa meme!"});
if (cmd==="number") return sock.sendMessage(from,{text:"🎲 "+Math.floor(Math.random()*100)});

// MONEY
if (cmd==="balance") return sock.sendMessage(from,{text:"💰 "+users[from].money});
if (cmd==="work"){
let earn=Math.floor(Math.random()*50);
users[from].money+=earn;
return sock.sendMessage(from,{text:"💵 Waxaad heshay "+earn});
}

// MENU FULL
if (cmd==="menu"){
return sock.sendMessage(from,{text:`
🤖 SHIIQ BOT PRO FULL

🎧 AUDIO
.shiiq axmad maxaa rabtaa
.heestii axmad

❤️ CUSTOM
.madaxey yaa waaye

📥 MEDIA
.vv
.img

🎵 MUSIC
.song magaca

👥 GROUP
.tagall

💰 MONEY
.balance
.work

😂 FUN
.hi
.joke
.number

⚙️ SETTINGS
.antilink on/off
.presence on/off
.autoreact on/off
`});
}

return sock.sendMessage(from,{text:"😎 Unknown"});
}catch(e){console.log(e)}
});
} catch(err){isStarted=false}
}

// ================= ROUTES =================
app.get("/",(req,res)=>res.send("BOT RUNNING"));

// STATUS (Heroku safe)
app.get("/status",(req,res)=>res.send("READY"));

// PAIR PAGE
app.get("/pair",(req,res)=>{
res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>SHIIQ BOT PRO</title>

<style>
body{
  background: linear-gradient(135deg,#020617,#0f172a);
  color:white;
  font-family:sans-serif;
  text-align:center;
  padding-top:60px;
}

.box{
  background:#0f172a;
  padding:25px;
  border-radius:20px;
  width:90%;
  max-width:350px;
  margin:auto;
  box-shadow:0 0 20px rgba(0,0,0,0.5);
}

h2{
  margin-bottom:20px;
}

input{
  width:90%;
  padding:12px;
  border:none;
  border-radius:10px;
  margin-bottom:15px;
  outline:none;
}

button{
  padding:12px 20px;
  border:none;
  border-radius:10px;
  background:#22c55e;
  color:white;
  font-weight:bold;
  cursor:pointer;
}

button:hover{
  background:#16a34a;
}

#status{
  margin-top:15px;
  font-size:14px;
}

#code{
  margin-top:20px;
  font-size:22px;
  font-weight:bold;
  color:#22c55e;
}

.footer{
  margin-top:20px;
  font-size:12px;
  color:#94a3b8;
}
</style>
</head>

<body>

<div class="box">
<h2>🤖 SHIIQ BOT PRO</h2>

<input id="num" placeholder="25261XXXXXXX">
<br>
<button onclick="getCode()">GET CODE</button>

<div id="status">⏳ Checking...</div>
<div id="code"></div>

<div class="footer">Powered by Shiiq Bot ⚡</div>
</div>

<script>
// STATUS LIVE
setInterval(async ()=>{
try{
let r = await fetch("/status");
let t = await r.text();

status.innerHTML = t==="READY"
? "✅ BOT READY"
: "❌ NOT READY";
}catch{
status.innerHTML="⚠️ ERROR";
}
},2000);

// GET CODE
async function getCode(){
code.innerHTML="⏳ Loading...";
let r = await fetch("/getcode?number="+num.value);
let t = await r.text();
code.innerHTML = t;
}
</script>

</body>
</html>
`);
});
`);
});

// GET CODE
app.get("/getcode", async (req,res)=>{
try{
if(!sock) return res.send("⏳ starting...");
const number=(req.query.number||"").replace(/[^0-9]/g,"");
if(!number) return res.send("❌ number geli");
const code=await sock.requestPairingCode(number);
res.send("✅ "+code);
}catch(e){res.send("❌ "+e.message)}
});

// START SERVER
app.listen(PORT,"0.0.0.0",async ()=>{
console.log("RUNNING "+PORT);
setTimeout(startBot,2000);
});
