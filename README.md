<h1 align="center">Hi there 👋, I'm Shiiqaxmad</h1>

<p align="center">
  💻 Web Developer | 🌱 Learning & Growing | 🚀 Future Software Engineer
</p>

---

### 👨‍💻 About Me
- 🔭 I’m currently working on improving my coding skills  
- 🌱 I’m learning JavaScript and modern web technologies  
- 🎯 Goal: Become a professional developer  
- 📫 How to reach me: your@email.com  

---

### 🛠️ Skills
- 💻 HTML, CSS  
- ⚡ JavaScript  
- 🧰 Git & GitHub  

---

### 📊 GitHub Stats
<p align="center">
  <img src="https://github-readme-stats.vercel.app/api?username=shiiqaxmad&show_icons=true&theme=tokyonight" />
</p>

---

![Developer](https://images.unsplash.com/photo-1518770660439-4636190af475)


<p align="center">
  <img src="https://files.catbox.moe/0r9w3y.jpg" width="150" style="border-radius:50%"/>
</p>

<h1 align="center">🤖 SHIIQ BOT</h1>


  <p align="center">
    <strong>🤖 SHIIQ AXMAD BOT</strong>
</p>

<p align="center">
    <strong>1. FORK REPOSITORY</strong>
  <br>
    <a href="https://github.com/shiiqaxmad/shiiqaxmad/fork" target="_blank">
        <img alt="Fork Repo" src="https://img.shields.io/badge/Fork%20Repo-100000?style=for-the-badge&logo=github&logoColor=white&labelColor=darkblue&color=darkblue"/>
    </a>
</p> 
<p align="center">
    <strong>2. SESSION & DEPLOYMENT</strong>
    <br><br>

    <!-- SESSION BUTTON -->
    <a href="https://github.com/shiiqaxmad/shiiqaxmad/tree/shiiqaxmad-patch-6-1" target="_blank">
        <img alt="SESSION" src="https://img.shields.io/badge/SESSION_ID-CLICK_HERE-100000?style=for-the-badge&logo=key&logoColor=white&labelColor=blue&color=blue"/>
    </a>

    <br><br>

    <!-- DEPLOYMENT BUTTON -->
    <a href="https://github.com/shiiqaxmad/shiiqaxmad/tree/shiiqaxmad-patch-6-1" target="_blank">
        <img alt="DEPLOY" src="https://img.shields.io/badge/DEPLOY_NOW-CLICK_HERE-100000?style=for-the-badge&logo=rocket&logoColor=white&labelColor=darkgreen&color=darkgreen"/>
    </a>
</p>

<p align="center">
  <a href="https://www.cypherx.space/">
    <img src="https://img.shields.io/badge/SESSION_&_DEPLOY-CLICK_HERE-darkred?style=for-the-badge&logo=github&logoColor=white"/>
  </a>
</p>
const express = require("express");
const { default: makeWASocket, useMultiFileAuthState } = require("@whiskeysockets/baileys");

const app = express();
const PORT = 3000;

let sock;

// START BOT
async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("session");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);
}
start();

// PAIR API
app.get("/pair", async (req, res) => {
  const number = req.query.number;

  if (!number) return res.send("Number geli!");

  try {
    const code = await sock.requestPairingCode(number);
    res.json({ code });
  } catch (e) {
    res.send("Error");
  }
});

// UI PAGE
app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>SHIIQ-X BOT</title>
    <script src="https://cdn.tailwindcss.com"></script>
  </head>

  <body class="bg-gradient-to-br from-black to-gray-900 text-white flex items-center justify-center h-screen">

  <div class="bg-gray-800 p-6 rounded-2xl text-center w-80 shadow-lg">

  <h1 class="text-2xl font-bold mb-2">🚀 SHIIQ-X BOT</h1>
  <p class="text-gray-400 mb-4">Pairing + Session System</p>

  <input id="number" class="w-full p-2 mb-3 rounded text-black" placeholder="2526xxxxxxx">

  <button onclick="pair()" class="w-full bg-purple-600 p-2 rounded mb-2">
  🔐 Get Pairing Code
  </button>

  <input id="session" class="w-full p-2 mb-3 rounded text-black" placeholder="Paste Session ID">

  <button onclick="saveSession()" class="w-full bg-green-600 p-2 rounded">
  📂 Use Session
  </button>

  <p id="result" class="mt-4 text-yellow-400"></p>

  </div>

  <script>
  async function pair() {
    let num = document.getElementById("number").value;

    let res = await fetch('/pair?number=' + num);
    let data = await res.json();

    document.getElementById("result").innerText = "Code: " + data.code;
  }

  function saveSession() {
    let session = document.getElementById("session").value;
    document.getElementById("result").innerText = "Session Saved ✅";
  }
  </script>

  </body>
  </html>
  `);
});

// RUN SERVER
app.listen(PORT, () => console.log("🔥 Server running on http://localhost:" + PORT));
