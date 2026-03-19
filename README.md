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
  const express = require("express");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const app = express();
app.use(express.urlencoded({ extended: true }));

app.all("/", async (req, res) => {
  let code = "";

  if (req.method === "POST") {
    try {
      const { number } = req.body;

      const { state } = await useMultiFileAuthState("./session");
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({ auth: state, version });
      code = await sock.requestPairingCode(number);

    } catch (e) {
      code = "ERROR";
    }
  }

  res.send(`<!DOCTYPE html>
  <html>
  <body style="background:#0f172a;color:white;text-align:center;padding-top:80px;font-family:sans-serif;">
    <h2>GET SESSION</h2>

    <form method="POST">
      <input name="number" placeholder="25261xxxxxxx" required style="padding:10px;border-radius:8px;border:none"><br><br>
      <button style="padding:10px 20px;background:#22c55e;border:none;border-radius:8px;color:white">GET CODE</button>
    </form>

    ${code ? `<h1 style="color:#22c55e;margin-top:20px">${code}</h1>` : ""}

  </body>
  </html>`);
});

app.listen(process.env.PORT || 3000);
