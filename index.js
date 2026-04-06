global.crypto = require("node:crypto").webcrypto;
global.File = require("node:buffer").File;

const express = require("express");
const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion
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

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", (update) => {
if (update.connection === "open") {
console.log("✅ BOT CONNECTED");
}
});
}

// HOME
app.get("/", (req,res)=>{
res.send("⚡ SHIIQ FAST PAIR RUNNING");
});

// PAIR PAGE (LIKE JAWAD)
app.get("/pair", (req,res)=>{
res.send(`
<html>
<body style="background:#0f172a;color:white;text-align:center">
<h2>⚡ FAST PAIR</h2>

<input id="num" placeholder="25261xxxxxxx" style="padding:10px">
<br><br>

<button onclick="g()" style="padding:10px">GET CODE</button>

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

// GET CODE (FAST)
app.get("/code", async (req,res)=>{
try{
const number=(req.query.number||"").replace(/[^0-9]/g,"");

if(!number) return res.send("❌ Enter number");

const code = await sock.requestPairingCode(number);

res.send("✅ CODE: "+code);

}catch(e){
res.send("❌ "+e.message);
}
});

// START SERVER
app.listen(PORT,"0.0.0.0", async ()=>{
console.log("🌐 RUNNING "+PORT);
await startBot();
});
