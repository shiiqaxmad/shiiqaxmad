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

const { state, saveCreds } = await useMultiFileAuthState("./session");
const { version } = await fetchLatestBaileysVersion();

sock = makeWASocket({
version,
logger: P({ level: "silent" }),
auth: state,
browser: Browsers.macOS("Shiiq Bot"),
markOnlineOnConnect: true,
});

// SAVE SESSION
sock.ev.on("creds.update", saveCreds);

// CONNECTION
sock.ev.on("connection.update", (update) => {
const { connection, lastDisconnect } = update;

if (connection === "open") {
console.log("✅ BOT READY 100%");
}

if (connection === "close") {
const reason = lastDisconnect?.error?.output?.statusCode;
console.log("❌ Closed:", reason);

isStarted = false;

// 🔥 FIX AUTO RECONNECT
if (reason === 401) {
console.log("⚠️ Session expired → delete session & pair again");
} else {
setTimeout(startBot, 3000);
}
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
audio:{url:"./audio1.opus"},
mimetype:"audio/ogg; codecs=opus",
ptt:true
});
}

if (cmd==="heestii axmad"){
return sock.sendMessage(from,{
audio:{url:"./audio2.mp3"},
mimetype:"audio/mp4",
ptt:true
});
}

// CUSTOM
if (cmd==="madaxey yaa waaye"){
return sock.sendMessage(from,{text:"❤️ Waa jacaylka Shiiq Axmad"});
}

// FUN
if (cmd==="hi") return sock.sendMessage(from,{text:"👋 Wcs"});
if (cmd==="joke") return sock.sendMessage(from,{text:"😂 Noloshu waa meme!"});

// MENU
if (cmd==="menu"){
return sock.sendMessage(from,{text:`
🤖 SHIIQ BOT PRO

.shiiq axmad maxaa rabtaa
.heestii axmad
.madaxey yaa waaye

.song magaca
.tagall

.balance
.work

.autoreact on/off
.antilink on/off
.presence on/off
`});
}

}catch(e){console.log(e)}
});
} catch(err){isStarted=false}
}

// ================= ROUTES =================
app.get("/",(req,res)=>res.send("BOT RUNNING"));

// STATUS REAL
app.get("/status",(req,res)=>{
if(sock && sock.user){
res.send("READY");
}else{
res.send("NOT READY");
}
});

// PAIR PAGE CLEAN
app.get("/pair",(req,res)=>{
res.send(`
<html><body style="background:#0f172a;color:white;text-align:center">
<h2>🤖 SHIIQ BOT PRO</h2>
<input id="num" placeholder="25261xxxxxxx">
<button onclick="g()">GET CODE</button>
<h3 id="out"></h3>
<script>
async function g(){
let r=await fetch("/getcode?number="+num.value);
out.innerHTML=await r.text();
}
</script>
</body></html>
`);
});

// GET CODE
app.get("/getcode", async (req,res)=>{
try{
if(!sock || !sock.user) return res.send("❌ Sug bot...");
const number=(req.query.number||"").replace(/[^0-9]/g,"");
if(!number) return res.send("❌ Number geli");
const code=await sock.requestPairingCode(number);
res.send("✅ "+code);
}catch(e){res.send("❌ "+e.message)}
});

// START SERVER
app.listen(PORT,"0.0.0.0",async ()=>{
console.log("RUNNING "+PORT);
setTimeout(startBot,2000);
});

// KEEP ALIVE
setInterval(()=>console.log("alive"),30000);

// SELF PING (KU BADAL LINKAGA)
setInterval(async ()=>{
try{
await axios.get("https://g-karola-shiiqbot-b484b9bc.koyeb.app/status");
}catch(e){}
},60000);
