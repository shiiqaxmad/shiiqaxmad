/**
 * SHIIQAXMAD Pairing Bot — Fixed Version
 * Fixes: missing archiver dep, wrong browser, no keepAlive,
 *        no makeCacheableSignalKeyStore, reconnect bug
 */
"use strict";

global.crypto = require("node:crypto").webcrypto;
global.File   = require("node:buffer").File;

const { execSync } = require("child_process");
const fs           = require("fs");

// ── Auto-install missing packages ─────────────────────────────
const PKGS = [
  "@whiskeysockets/baileys@latest",
  "@hapi/boom", "pino", "express", "archiver", "qrcode-terminal"
];
(function install() {
  const miss = PKGS.map(p => p.split("@")[0])
    .filter(p => { try { require.resolve(p); return false; } catch { return true; } });
  if (!miss.length) return;
  console.log("📦 Installing:", miss.join(", "));
  execSync(`npm install ${PKGS.join(" ")} --save`, { stdio:"inherit" });
  console.log("✅ Done!\n");
})();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const { Boom }    = require("@hapi/boom");
const pino        = require("pino");
const express     = require("express");
const archiver    = require("archiver");
const qrTerm      = require("qrcode-terminal");

const app  = express();
const PORT = process.env.PORT || 8000;

let sock;
let SESSION_STRING = "";
let isConnecting   = false;

process.on("unhandledRejection", e => console.error("[Rejection]", e?.message));
process.on("uncaughtException",  e => console.error("[Exception]",  e?.message));

// ── Start Bot ──────────────────────────────────────────────────
async function startBot() {
  if (isConnecting) return;
  isConnecting = true;

  try {
    if (!fs.existsSync("./session")) fs.mkdirSync("./session", { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version }          = await fetchLatestBaileysVersion();
    const logger               = pino({ level: "silent" });

    sock = makeWASocket({
      version,
      logger,
      auth: {
        creds : state.creds,
        // ← FIX: makeCacheableSignalKeyStore prevents key corruption
        keys  : makeCacheableSignalKeyStore(state.keys, logger),
      },
      // ← FIX: Browsers.ubuntu is accepted by WhatsApp servers
      //   Custom strings like Browsers.macOS("SHIIQAXMAD") get rejected
      browser              : Browsers.ubuntu("Chrome"),
      printQRInTerminal    : false,
      markOnlineOnConnect  : false,
      connectTimeoutMs     : 60_000,
      // ← FIX: keepAlive prevents socket dying before pairing completes
      keepAliveIntervalMs  : 25_000,
      retryRequestDelayMs  : 2_000,
      syncFullHistory      : false,
      getMessage           : async () => ({ conversation: "" }),
    });

    sock.ev.on("creds.update", saveCreds);

    let pairingDone = false;

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      // Show QR in terminal as fallback
      if (qr) {
        console.log("\n📱 QR ready (scan or use /pair web UI)\n");
        qrTerm.generate(qr, { small: true });
      }

      if (connection === "open") {
        isConnecting = false;
        console.log("✅ BOT CONNECTED");

        // Build session zip + base64 string
        try {
          const output   = fs.createWriteStream("session.zip");
          const archive  = archiver("zip");
          archive.pipe(output);
          archive.directory("./session/", false);
          archive.finalize();
          output.on("close", () => {
            const data = fs.readFileSync("session.zip");
            SESSION_STRING = "SHIIQAXMAD:~" + data.toString("base64");
            console.log("SESSION STRING READY ✅");
          });
        } catch(e) { console.error("[session-zip]", e.message); }
      }

      if (connection === "close") {
        const status   = new Boom(lastDisconnect?.error)?.output?.statusCode;
        const loggedOut = status === DisconnectReason.loggedOut;
        console.log("❌ Disconnected — code:", status);
        isConnecting = false;
        if (loggedOut) {
          console.log("Logged out — delete ./session folder and restart.");
        } else {
          console.log("Reconnecting in 4s…");
          setTimeout(startBot, 4000);
        }
      }
    });

  } catch(e) {
    console.error("[startBot]", e.message);
    isConnecting = false;
    setTimeout(startBot, 5000);
  }
}

// ── Web Routes ─────────────────────────────────────────────────
app.get("/", (req, res) => res.send("SHIIQAXMAD BOT RUNNING ✅"));

app.get("/pair", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>SHIIQAXMAD Pair</title>
  <style>
    body{background:#0f172a;color:white;text-align:center;font-family:sans-serif;padding:40px}
    input,textarea{padding:10px;border-radius:8px;border:1px solid #334155;
      background:#1e293b;color:white;font-size:16px;width:280px}
    button{padding:12px 28px;background:#6366f1;color:white;border:none;
      border-radius:8px;cursor:pointer;font-size:15px;margin:8px}
    button:hover{background:#4f46e5}
    h3{color:#94a3b8}
  </style>
</head>
<body>
  <h2>🤖 SHIIQAXMAD PAIRING</h2>
  <p style="color:#94a3b8">Enter your WhatsApp number with country code</p>
  <p style="color:#64748b;font-size:13px">e.g. 2348012345678 &nbsp;|&nbsp; 447911123456</p>
  <br>
  <input id="num" placeholder="2348012345678" type="number"/>
  <br><br>
  <button onclick="getCode()">🔑 Get Pairing Code</button>
  <h3 id="code"></h3>
  <hr style="border-color:#1e293b;margin:20px">
  <h3>📋 Session ID</h3>
  <textarea id="sess" rows="6" cols="42" readonly placeholder="Appears after linking..."></textarea>
  <br>
  <button onclick="copy()">📋 Copy Session</button>
  <script>
    async function getCode(){
      const num = document.getElementById('num').value;
      if(!num){alert('Enter your number first!');return;}
      document.getElementById('code').innerHTML = '⏳ Requesting code...';
      const r = await fetch('/getcode?number='+num);
      document.getElementById('code').innerHTML = await r.text();
      // Poll for session string
      let tries = 0;
      const poll = setInterval(async()=>{
        const s = await fetch('/session');
        const txt = await s.text();
        if(txt && !txt.includes('Waiting')){
          document.getElementById('sess').value = txt;
          clearInterval(poll);
        }
        if(++tries > 20) clearInterval(poll);
      }, 3000);
    }
    function copy(){
      const s = document.getElementById('sess');
      s.select();
      navigator.clipboard.writeText(s.value).then(()=>alert('Copied ✅'));
    }
  </script>
</body>
</html>`);
});

app.get("/getcode", async (req, res) => {
  try {
    if (!sock) return res.send("⏳ Bot starting, please wait 10 seconds and try again…");
    const number = (req.query.number || "").replace(/[^0-9]/g, "");
    if (!number) return res.send("❌ Enter a valid phone number");
    const code = await sock.requestPairingCode(number);
    const fmt  = code?.match(/.{1,4}/g)?.join("-") ?? code;
    res.send(`✅ PAIRING CODE: <strong style="font-size:24px;color:#6366f1">${fmt}</strong><br><br>
      <small>Open WhatsApp → ⋮ → Linked Devices → Link a Device → Link with phone number → Enter: ${fmt}</small>`);
  } catch(e) {
    res.send("❌ Error: " + e.message + "<br><br>Make sure your number is correct and WhatsApp is active.");
  }
});

app.get("/session", (req, res) => {
  if (!SESSION_STRING) return res.send("⏳ Waiting for session… Enter the pairing code first.");
  res.send(SESSION_STRING);
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`🌐 Open: http://localhost:${PORT}/pair`);
  startBot();
});
