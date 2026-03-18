        require('dotenv').config();

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage
} = require('@whiskeysockets/baileys');

const P = require('pino');
const fs = require('fs');

const prefix = '.';
const owner = process.env.OWNER + '@s.whatsapp.net';
const phoneNumber = process.env.NUMBER;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  // Pairing
  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(phoneNumber);
    console.log('📲 Pairing Code:', code);
  }

  // Connection
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot Connected');
    }
  });

  // Messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message) return;

      await sock.readMessages([msg.key]);

      const from = msg.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = msg.key.participant || from;

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        '';

      const text = body.toLowerCase();

      // =========================
      // 🤖 AUTO REPLY (SHIIQ BOT)
      // =========================
      if (text === 'shiiq bot') {
        return sock.sendMessage(from, {
          text: 'Haa dheh 👀 maxaan kuu qabtaa?'
        });
      }

      // =========================
      // 👑 CREATOR QUESTION
      // =========================
      if (
        text.includes('yaa ku sameeyay shiiq bot') ||
        text.includes('yaa sameeyay shiiq bot')
      ) {
        return sock.sendMessage(from, {
          text: '🤖 Shiiq Bot waxaa sameeyay: Sheikh Axmed 🇸🇴'
        });
      }

      // =========================
      // 🎧 SAVE VOICE
      // =========================
      if (msg.message.audioMessage) {
        const buffer = await downloadMediaMessage(msg, 'buffer', {});
        fs.writeFileSync('./voice.ogg', buffer);

        return sock.sendMessage(from, {
          text: '🎧 Codka waa la keydiyay!'
        });
      }

      // =========================
      // COMMAND SYSTEM
      // =========================
      if (!body.startsWith(prefix)) return;

      const args = body.slice(prefix.length).trim().split(' ');
      const cmd = args.shift().toLowerCase();

      // GROUP INFO
      let isAdmin = false;
      let isBotAdmin = false;

      if (isGroup) {
        const metadata = await sock.groupMetadata(from);
        const admins = metadata.participants
          .filter(p => p.admin !== null)
          .map(p => p.id);

        isAdmin = admins.includes(sender);
        isBotAdmin = admins.includes(sock.user.id);
      }

      // =========================
      // 📜 MENU
      // =========================
      if (cmd === 'menu') {
        return sock.sendMessage(from, {
          text: `🤖 *SHIIQ BOT FULL*

.menu
.ping
.say
.voice
.kick
.promote
.demote
.tagall
.creator`
        });
      }

      // PING
      if (cmd === 'ping') {
        return sock.sendMessage(from, { text: '🏓 Pong!' });
      }

      // 🎤 TEXT → VOICE
      if (cmd === 'say') {
        const text = args.join(' ');
        if (!text) return sock.sendMessage(from, { text: 'Qor wax la akhriyo' });

        const url = `https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(text)}`;

        return sock.sendMessage(from, {
          audio: { url },
          mimetype: 'audio/mp4',
          ptt: true
        });
      }

      // VOICE TEST
      if (cmd === 'voice') {
        return sock.sendMessage(from, {
          audio: { url: 'https://files.catbox.moe/5x6l6v.mp3' },
          mimetype: 'audio/mp4',
          ptt: true
        });
      }

      // OWNER
      if (cmd === 'owner') {
        if (sender !== owner)
          return sock.sendMessage(from, { text: '❌ Owner kaliya!' });

        return sock.sendMessage(from, { text: '👑 Owner waa sax!' });
      }

      // =========================
      // 👥 GROUP COMMANDS
      // =========================
      if (isGroup) {

        // KICK
        if (cmd === 'kick') {
          if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin kaliya!' });
          if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin ma aha!' });

          const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
          if (!mentioned) return sock.sendMessage(from, { text: 'Mention qof' });

          return sock.groupParticipantsUpdate(from, mentioned, 'remove');
        }

        // PROMOTE
        if (cmd === 'promote') {
          if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin kaliya!' });
          if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin ma aha!' });

          const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
          return sock.groupParticipantsUpdate(from, mentioned, 'promote');
        }

        // DEMOTE
        if (cmd === 'demote') {
          if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin kaliya!' });
          if (!isBotAdmin) return sock.sendMessage(from, { text: '❌ Bot admin ma aha!' });

          const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
          return sock.groupParticipantsUpdate(from, mentioned, 'demote');
        }

        // TAG ALL
        if (cmd === 'tagall') {
          if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin kaliya!' });

          const metadata = await sock.groupMetadata(from);
          const participants = metadata.participants;

          let text = '📢 Tag All\n\n';

          for (let p of participants) {
            text += `@${p.id.split('@')[0]}\n`;
          }

          return sock.sendMessage(from, {
            text,
            mentions: participants.map(p => p.id)
          });
        }
      }

      // CREATOR COMMAND
      if (cmd === 'creator') {
        return sock.sendMessage(from, {
          text: '👨‍💻 Sheikh Axmed 🇸🇴'
        });
      }

    } catch (err) {
      console.log('❌ Error:', err);
    }
  });
}

startBot();
