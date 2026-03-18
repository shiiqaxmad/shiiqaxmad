    const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const P = require('pino');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state
  });

  // 💾 Save session
  sock.ev.on('creds.update', saveCreds);

  // 🔑 PAIRING CODE LOGIN
  if (!sock.authState.creds.registered) {
    const phoneNumber = '252615810513'; // 🔁 bedel number-kaaga
    const code = await sock.requestPairingCode(phoneNumber);
    console.log('📲 Pairing Code:', code);
  }

  // 🔄 CONNECTION
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot-ku wuu xirmay (Connected)');
    }
  });

  // 💬 MESSAGES
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = msg.key.participant || from;

    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      '';

    const command = body.toLowerCase();

    const owner = '252615810513@s.whatsapp.net';

    const isBotCalled = command.startsWith('shiiq bot');
    const args = command.replace('shiiq bot', '').trim();

    if (!isBotCalled) return;

    // 👑 OWNER
    if (args === '.owner') {
      if (sender !== owner)
        return sock.sendMessage(from, { text: '❌ Owner kaliya!' });

      return sock.sendMessage(from, {
        text: '👑 Owner command waa shaqeynayaa'
      });
    }

    // 📜 MENU
    if (args === '.menu') {
      return sock.sendMessage(from, {
        text: `🇸🇴 *Bot Menu*

.menu - Liiska amarada
.kick - Ka saar qof (admin)
.promote - Admin ka dhig
.demote - Ka qaad admin
.voice - Cod tijaabo ah`
      });
    }

    // 🔊 VOICE
    if (args === '.voice') {
      return sock.sendMessage(from, {
        audio: { url: 'https://files.catbox.moe/5x6l6v.mp3' },
        mimetype: 'audio/mp4',
        ptt: true
      });
    }

    // 👥 GROUP COMMANDS
    if (isGroup) {
      const metadata = await sock.groupMetadata(from);
      const admins = metadata.participants
        .filter(p => p.admin !== null)
        .map(p => p.id);

      const isAdmin = admins.includes(sender);

      // ❌ KICK
      if (args.startsWith('.kick')) {
        if (!isAdmin)
          return sock.sendMessage(from, { text: '❌ Admin kaliya!' });

        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
        if (!mentioned)
          return sock.sendMessage(from, { text: 'Qof mention garee' });

        return sock.groupParticipantsUpdate(from, mentioned, 'remove');
      }

      // ⬆️ PROMOTE
      if (args.startsWith('.promote')) {
        if (!isAdmin)
          return sock.sendMessage(from, { text: '❌ Admin kaliya!' });

        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
        return sock.groupParticipantsUpdate(from, mentioned, 'promote');
      }

      // ⬇️ DEMOTE
      if (args.startsWith('.demote')) {
        if (!isAdmin)
          return sock.sendMessage(from, { text: '❌ Admin kaliya!' });

        const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
        return sock.groupParticipantsUpdate(from, mentioned, 'demote');
      }
    }

    // 🤖 CREATOR
    if (
      args.includes('yaa ku sameeyay') ||
      args.includes('yaa sameeyay') ||
      args.includes('who made you')
    ) {
      return sock.sendMessage(from, {
        text: 'Bot-kan waxaa sameeyay: Sheikh Axmed 🏴 +252615810513'
      });
    }
  });
}

startBot();
