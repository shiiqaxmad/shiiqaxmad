global.crypto = require('node:crypto').webcrypto
global.File = require('node:buffer').File

const fs = require('fs')
const archiver = require('archiver')
const express = require('express')
const P = require('pino')
const { Boom } = require('@hapi/boom')

const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers
} = require('@whiskeysockets/baileys')

const app = express()
const PORT = process.env.PORT || 8000

let sock = null
let pairingReady = false
let reconnecting = false
let SESSION_STRING = ''

const logger = P({ level: 'info' })

async function generateSessionString() {
  return new Promise((resolve, reject) => {
    try {
      const output = fs.createWriteStream('session.zip')
      const archive = archiver('zip', {
        zlib: { level: 9 }
      })

      output.on('close', () => {
        const data = fs.readFileSync('session.zip')
        SESSION_STRING = 'SHIIQAXMAD:~' + data.toString('base64')

        console.log('✅ SESSION READY')
        resolve(SESSION_STRING)
      })

      archive.on('error', reject)

      archive.pipe(output)
      archive.directory('./session/', false)
      archive.finalize()
    } catch (err) {
      reject(err)
    }
  })
}

async function startBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./session')

    const { version } = await fetchLatestBaileysVersion()

    console.log('📦 WA VERSION:', version)

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      browser: Browsers.windows('Chrome'),
      usePairingCode: true,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: true,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      emitOwnEvents: true,
      fireInitQueries: true
    })

    sock.ev.on('creds.update', async () => {
      try {
        await saveCreds()
        console.log('💾 CREDS SAVED')
      } catch (err) {
        console.log('❌ CREDS SAVE ERROR:', err)
      }
    })

    sock.ev.on('connection.update', async (update) => {
      try {
        const {
          connection,
          lastDisconnect,
          receivedPendingNotifications
        } = update

        console.log('📡 UPDATE:', update)

        if (receivedPendingNotifications) {
          console.log('📨 PENDING NOTIFICATIONS RECEIVED')
        }

        if (connection === 'open') {
          pairingReady = true

          console.log('✅ WHATSAPP CONNECTED')

          await generateSessionString()
        }

        if (connection === 'close') {
          pairingReady = false

          const statusCode =
            new Boom(lastDisconnect?.error)?.output?.statusCode

          console.log('❌ CONNECTION CLOSED:', statusCode)

          if (statusCode === DisconnectReason.loggedOut) {
            console.log('🚫 DEVICE LOGGED OUT')

            if (fs.existsSync('./session')) {
              fs.rmSync('./session', {
                recursive: true,
                force: true
              })
            }

            process.exit(1)
          }

          if (!reconnecting) {
            reconnecting = true

            console.log('🔄 RECONNECTING IN 5 SECONDS...')

            setTimeout(async () => {
              reconnecting = false
              await startBot()
            }, 5000)
          }
        }
      } catch (err) {
        console.log('❌ connection.update ERROR:', err)
      }
    })

    process.on('unhandledRejection', (reason) => {
      console.log('❌ UNHANDLED REJECTION:', reason)
    })

    process.on('uncaughtException', (err) => {
      console.log('❌ UNCAUGHT EXCEPTION:', err)
    })
  } catch (err) {
    console.log('❌ START BOT ERROR:', err)

    setTimeout(startBot, 5000)
  }
}

app.get('/', (req, res) => {
  res.send('✅ SHIIQAXMAD BOT ONLINE')
})

app.get('/pair', (req, res) => {
  res.send(`
  <html>
  <body style="background:#0f172a;color:white;text-align:center;font-family:sans-serif;padding-top:40px">

  <h2>🤖 SHIIQAXMAD PAIR</h2>

  <input id="num" placeholder="25261xxxxxxx"
  style="padding:12px;border:none;border-radius:8px;width:250px"/>

  <br><br>

  <button onclick="getCode()"
  style="padding:12px 20px;border:none;border-radius:8px;cursor:pointer">
  GET CODE
  </button>

  <h3 id="code"></h3>

  <hr>

  <h3>SESSION ID</h3>

  <textarea id="sess" rows="8" cols="45" readonly></textarea>

  <br><br>

  <button onclick="copy()">COPY</button>

  <script>
  async function getCode(){

    code.innerHTML = '⏳ Generating...'

    let r = await fetch('/getcode?number=' + num.value)

    code.innerHTML = await r.text()

    setTimeout(async ()=>{
      let s = await fetch('/session')
      sess.value = await s.text()
    },6000)
  }

  function copy(){
    navigator.clipboard.writeText(sess.value)
    alert('Copied ✅')
  }
  </script>

  </body>
  </html>
  `)
})

app.get('/getcode', async (req, res) => {
  try {
    if (!sock) {
      return res.send('⏳ Socket Starting...')
    }

    if (!pairingReady) {
      return res.send('⏳ WhatsApp Initializing...')
    }

    const number = (req.query.number || '').replace(/[^0-9]/g, '')

    if (!number) {
      return res.send('❌ Invalid Number')
    }

    console.log('📲 REQUESTING CODE FOR:', number)

    const code = await sock.requestPairingCode(number)

    console.log('✅ PAIRING CODE:', code)

    res.send('✅ CODE: ' + code)
  } catch (err) {
    console.log('❌ PAIRING ERROR:', err)
    res.send('❌ ' + err.message)
  }
})

app.get('/session', (req, res) => {
  if (!SESSION_STRING) {
    return res.send('⏳ Waiting...')
  }

  res.send(SESSION_STRING)
})

app.listen(PORT, '0.0.0.0', async () => {
  console.log('🚀 SERVER RUNNING ON PORT', PORT)
  await startBot()
})
