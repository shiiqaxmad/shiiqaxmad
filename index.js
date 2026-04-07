global.crypto = require("node:crypto").webcrypto;
global.File = require("node:buffer").File;

const fs = require("fs");
const archiver = require("archiver");

const express = require("express");
const {
default: makeWASocket,
useMultiFileAuthState,
fetchLatestBaileysVersion,
Browsers
} = require("@whiskeysockets/baileys");

const P = require("pino");

const app = express();
const PORT = process.env.PORT || 8000;

let sock;
let isStarted = false;
let SESSION_STRING = "";

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
browser: Browsers.macOS("SHIIQAXMAD"),
markOnlineOnConnect: true,
});

// SAVE
sock.ev.on("creds.update", saveCreds);

// CONNECTION
sock.ev.on("connection.update", (update) => {
const { connection } = update;

if (connection === "open") {
console.log("✅ BOT READY");

// 🔥 CREATE SESSION STRING
const output = fs.createWriteStream("session.zip");
const archive = archiver("zip");

archive.pipe(output);
archive.directory("./session/", false);
archive.finalize();

output.on("close", () => {
const data = fs.readFileSync("session.zip");
const base64 = data.toString("base64");

SESSION_STRING = "SHIIQAXMAD:~" + base64;

console.log("SESSION READY ✅");
});
}

if (connection === "close") {
console.log("❌ reconnecting...");
isStarted = false;
setTimeout(startBot, 3000);
}
});

} catch (e) {
isStarted = false;
console.log(e);
}
}

// ================= ROUTES =================

// HOME
app.get("/", (req,res)=>res.send("SHIIQAXMAD BOT RUNNING ✅"));

// PAIR PAGE
app.get("/pair",(req,res)=>{
res.send(`
<html>
<body style="background:#0f172a;color:white;text-align:center;font-family:sans-serif">
<h2>🤖 SHIIQAXMAD PAIR</h2>

<input id="num" placeholder="25261xxxxxxx"/>
<br><br>
<button onclick="getCode()">GET CODE</button>

<h3 id="code"></h3>

<hr>
<h3>SESSION ID</h3>
<textarea id="sess" rows="6" cols="40" readonly></textarea>
<br>
<button onclick="copy()">COPY</button>

<script>
async function getCode(){
let r = await fetch("/getcode?number="+num.value);
code.innerHTML = await r.text();

// fetch session after few sec
setTimeout(async ()=>{
let s = await fetch("/session");
sess.value = await s.text();
},4000);
}

function copy(){
navigator.clipboard.writeText(sess.value);
alert("Copied ✅");
}
</script>

</body>
</html>
`);
});

// GET CODE
app.get("/getcode", async (req,res)=>{
try{
if(!sock) return res.send("⏳ Bot starting...");

const number = (req.query.number||"").replace(/[^0-9]/g,"");
if(!number) return res.send("❌ Enter number");

const code = await sock.requestPairingCode(number);
res.send("✅ CODE: "+code);

}catch(e){
res.send("❌ "+e.message);
}
});

// SESSION API
app.get("/session",(req,res)=>{
if(!SESSION_STRING) return res.send("⏳ Waiting...");
res.send(SESSION_STRING);
});

// START SERVER
app.listen(PORT,"0.0.0.0",()=>{
console.log("🚀 RUNNING "+PORT);
startBot();
});
