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
printQRInTerminal: false
});

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", (update) => {
const { connection, lastDisconnect } = update;

if (connection === "open") {
console.log("✅ BOT READY");
}

if (connection === "close") {
console.log("❌ Connection closed");
setTimeout(startBot, 3000);
}
});
}

// HOME
app.get("/", (req, res) => {
res.send("BOT RUNNING ✅");
});

// PAIR PAGE
app.get("/pair", (req, res) => {
res.send(`
<html>
<body style="background:black;color:white;text-align:center">
<h2>PAIR BOT</h2>
<input id="num" placeholder="25261xxxxxxx">
<button onclick="g()">GET CODE</button>
<h3 id="out"></h3>

<script>
async function g(){
let num = document.getElementById("num").value;
let r = await fetch("/code?num="+num);
let t = await r.text();
document.getElementById("out").innerHTML = t;
}
</script>
</body>
</html>
`);
});

// GET CODE (IMPORTANT FIX)
app.get("/code", async (req, res) => {
try {
if (!sock) return res.send("❌ Bot starting...");

const number = (req.query.num || "").replace(/[^0-9]/g, "");
if (!number) return res.send("❌ Number geli");

const code = await sock.requestPairingCode(number);
res.send("✅ CODE: " + code);

} catch (e) {
res.send("❌ " + e.message);
}
});

// START SERVER
app.listen(PORT, () => {
console.log("RUNNING " + PORT);
startBot();
});
