require('dotenv').config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');

const SUDO = process.env.OWNER + '@s.whatsapp.net';

const sessions = {};

async function createSession(id, number) {

  const sessionPath = `./sessions/${id}`;

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(number);
    console.log(`📲 Pairing for ${number}:`, code);
  }

  sock.ev.on('connection.update', (update) => {
    if (update.connection === 'open') {
      console.log(`✅ Connected: ${number}`);
    }
  });

  sessions[id] = sock;
}

// MAIN CONTROL BOT
async function startMainBot() {

  const { state, saveCreds } = await useMultiFileAuthState('./main-session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(process.env.NUMBER);
    console.log("📲 MAIN BOT PAIR:", code);
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

    // =========================
    // 👑 SUDO ONLY COMMAND
    // =========================
    if (text.startsWith('.add')) {
      if (sender !== SUDO) return;

      const number = text.split(' ')[1];
      if (!number) {
        return sock.sendMessage(from, { text: 'Gali number' });
      }

      await createSession(number, number);

      return sock.sendMessage(from, {
        text: `✅ Session started for ${number}`
      });
    }

    // =========================
    // 👤 USER PAIR COMMAND
    // =========================
    if (text.startsWith('.pair')) {
      const number = text.split(' ')[1];
      if (!number) {
        return sock.sendMessage(from, { text: 'Isticmaal: .pair 25261xxxx' });
      }

      await createSession(number, number);

      return sock.sendMessage(from, {
        text: `📲 Pairing code console-ka ka eeg: ${number}`
      });
    }
  });
}

startMainBot();
