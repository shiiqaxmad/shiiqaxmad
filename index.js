global.crypto = require("node:crypto").webcrypto;
global.File = require("node:buffer").File;

const express = require("express");
const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
DisconnectReason
} = require("@whiskeysockets/baileys");

const P = require("pino");

const app = express();
const PORT = process.env.PORT || 8000;

let sock;

// START BOT
async function startBot() {
const { state, saveCreds } = await useMultiFileAuthState("./session");
const { version } = await fetchLatestBaileysVersion();

sock = makeWASocket({
version,
logger: P({ level: "silent" }),
auth: state,
printQRInTerminal: false,
});

// SAVE SESSION
sock.ev.on("creds.update", saveCreds);

// CONNECTION SYSTEM 🔥
sock.ev.on("connection.update", (update) => {
const { connection, lastDisconnect } = update;

if (connection === "open") {
console.log("✅ BOT CONNECTED");
}

if (connection === "close") {
const reason = lastDisconnect?.error?.output?.statusCode;
console.log("❌ Closed:", reason);

// AUTO RECONNECT
if (reason !== DisconnectReason.loggedOut) {
console.log("🔄 Reconnecting...");
startBot();
} else {
console.log("⚠️ Session expired");
}
}
});
}

// HOME
app.get("/", (req,res)=>{
res.send("⚡ SHIIQ FAST PAIR PRO");
});

// 🔥 PRO PAIR PAGE
app.get("/pair",(req,res)=>{
res.send(`
<html>
<body style="background:#0f172a;color:white;text-align:center;font-family:sans-serif">

<h2>⚡ SHIIQ FAST PAIR</h2>

<input id="num" placeholder="25261xxxxxxx" style="padding:12px;border-radius:8px"><br><br>

<button onclick="g()" style="padding:12px;border-radius:8px;background:#22c55e;color:white">GET CODE</button>

<h2 id="out"></h2>

<script>
async function g(){
let n=document.getElementById("num").value;

document.getElementById("out").innerHTML="⏳ Generating...";

let r=await fetch("/code?number="+n);
let t=await r.text();

document.getElementById("out").innerHTML=t;
}
</script>

</body>
</html>
`);
});

// 🔥 FAST CODE
app.get("/code", async (req,res)=>{
try{
if(!sock) return res.send("⏳ Bot starting...");

const number=(req.query.number||"").replace(/[^0-9]/g,"");
if(!number) return res.send("❌ Enter number");

const code = await sock.requestPairingCode(number);

res.send("✅ CODE: "+code);

}catch(e){
res.send("❌ "+e.message);
}
});

// START
app.listen(PORT,"0.0.0.0", async ()=>{
console.log("🌐 RUNNING "+PORT);
startBot();
});

// KEEP ALIVE
setInterval(()=>{
console.log("🤖 Alive...");
},30000);
