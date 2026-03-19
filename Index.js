    console.log(`📲 Pairing for ${number}:`, code);
  }

  sock.ev.on('connection.update', (update) => {
    if (update.connection === 'open') {
      console.log(`✅ Connected: ${number}`);
    }
  });

  require('dotenv').config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');

const SUDO = process.env.OWNER + '@s.whatsapp.net';

async function startBot() {

  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state,
    browser: Browsers.macOS("shiiq hacker")
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(process.env.NUMBER);
    console.log("📲 PAIR:", code);
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    const lower = text.toLowerCase();

    // 🔕 Kaliya shaqee marka "shiiq bot" la dhaho
    if (!lower.includes('shiiq bot')) return;

    // ✂️ command-ka ka saar "shiiq bot"
    const command = lower.replace('shiiq bot', '').trim();

    // ================= REPLY =================
    if (command === 'hello' || command === 'hi') {
      return sock.sendMessage(from, {
        text: '👋 Salaam, waa shiiq hacker bot'
      });
    }

    if (command.includes('yaa ku sameeyay')) {
      return sock.sendMessage(from, {
        text: '🤖 Waxaa sameeyay Sheikh Axmad'
      });
    }

    // ================= VOICE =================
    if (command === 'cod' || command === 'voice') {
      return sock.sendMessage(from, {
        audio: { url: 'https://files.catbox.moe/8q3z8o.mp3' },
        mimetype: 'audio/mp4',
        ptt: true
      });
    }

    // ================= GROUP =================
    if (from.endsWith('@g.us')) {

      // 🔒 XIR GROUP
      if (command === 'groupka xir') {
        if (sender !== SUDO) {
          return sock.sendMessage(from, { text: '❌ Adiga ma tihid owner' });
        }

        await sock.groupSettingUpdate(from, 'announcement');
        return sock.sendMessage(from, { text: '🔒 Group waa la xiray' });
      }

      // 🔓 FUR GROUP
      if (command === 'groupka fur') {
        if (sender !== SUDO) {
          return sock.sendMessage(from, { text: '❌ Adiga ma tihid owner' });
        }

        await sock.groupSettingUpdate(from, 'not_announcement');
        return sock.sendMessage(from, { text: '🔓 Group waa la furay' });
      }

      // 🚫 ANTI LINK
      if (lower.includes('chat.whatsapp.com')) {
        if (sender !== SUDO) {
          await sock.sendMessage(from, { text: '🚫 Link lama ogola' });
          await sock.groupParticipantsUpdate(from, [sender], 'remove');
        }
      }
    }

  });
}

startBot();
