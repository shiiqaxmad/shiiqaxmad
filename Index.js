// Simple Clean WhatsApp Bot (Baileys) // Features: Somali language, group admin tools, voice/audio reply, basic commands

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys'); const P = require('pino'); const fs = require('fs');

async function startBot() { const { state, saveCreds } = await useMultiFileAuthState('./session'); const { version } = await fetchLatestBaileysVersion();

const sock = makeWASocket({ version, logger: P({ level: 'silent' }), auth: state });

sock.ev.on('creds.update', saveCreds);

sock.ev.on('connection.update', (update) => { const { connection, lastDisconnect } = update; if (connection === 'close') { const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut; if (shouldReconnect) startBot(); } else if (connection === 'open') { console.log('Bot-ku wuu xirmay (Connected)'); } });

sock.ev.on('messages.upsert', async ({ messages }) => { const msg = messages[0]; if (!msg.message) return;

const from = msg.key.remoteJid;
const isGroup = from.endsWith('@g.us');
const sender = msg.key.participant || from;

const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

const command = body.toLowerCase();

// OWNER NUMBER
const owner = '252615810513@s.whatsapp.net';

// Bot trigger name
const isBotCalled = command.startsWith('shiiq bot');
const args = command.replace('shiiq bot', '').trim();

// Only respond if bot is called
if (!isBotCalled) return;

// OWNER COMMAND
if (args === '.owner') {
  if (sender !== owner) return sock.sendMessage(from, { text: '❌ Tani waa amar owner kaliya!' });

  await sock.sendMessage(from, {
    text: '👑 Owner command waa shaqeynayaa'
  });
}

// MENU
if (args === '.menu') {
  await sock.sendMessage(from, {
    text: `🇸🇴 *Bot Menu*

.menu - Liiska amarada .kick - Ka saar qof (admin) .promote - Admin ka dhig .demote - Ka qaad admin .voice - Cod tijaabo ah` }); }

// VOICE
if (args === '.voice') {
  await sock.sendMessage(from, {
    audio: { url: 'https://files.catbox.moe/5x6l6v.mp3' },
    mimetype: 'audio/mp4',
    ptt: true
  });
}

// GROUP ONLY FEATURES
if (isGroup) {
  const metadata = await sock.groupMetadata(from);
  const admins = metadata.participants.filter(p => p.admin !== null).map(p => p.id);

  const isAdmin = admins.includes(sender);

  // KICK
  if (args.startsWith('.kick')) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin kaliya!' });

    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    if (!mentioned) return sock.sendMessage(from, { text: 'Qof mention garee' });

    await sock.groupParticipantsUpdate(from, mentioned, 'remove');
  }

  // PROMOTE
  if (args.startsWith('.promote')) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin kaliya!' });

    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    await sock.groupParticipantsUpdate(from, mentioned, 'promote');
  }

  // DEMOTE
  if (args.startsWith('.demote')) {
    if (!isAdmin) return sock.sendMessage(from, { text: '❌ Admin kaliya!' });

    const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
    await sock.groupParticipantsUpdate(from, mentioned, 'demote');
  }
}
  }

// CREATOR QUESTION
if (args.includes('yaa ku sameeyay') || args.includes('yaa sameeyay') || args.includes('who made you')) {
  await sock.sendMessage(from, {
    text: 'Bot-kan waxaa sameeyay: شيخ أحمد 🏴 +252615810513'
  });
}

}); }

startBot();

// REQUIREMENTS: // npm install @whiskeysockets/baileys pino fs

// RUN: // node index.js
