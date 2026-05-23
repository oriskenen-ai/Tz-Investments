const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
require('dotenv').config();

const db = require('./database');

const app = express();

// ==========================================
// CONFIG
// ==========================================
const BOT_TOKEN    = process.env.TELEGRAM_BOT_TOKEN;
const PORT         = process.env.PORT || 3000;
const WEBHOOK_URL  = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || `http://localhost:${PORT}`;
const ADMIN_CHAT_ID = process.env.SUPER_ADMIN_CHAT_ID;

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not set. Add it to your environment variables.');
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN);
let dbReady = false;

// ==========================================
// HELPERS
// ==========================================
async function sendToAdmin(message) {
    if (!ADMIN_CHAT_ID) return console.error('❌ SUPER_ADMIN_CHAT_ID not set');
    try { await bot.sendMessage(ADMIN_CHAT_ID, message); }
    catch (e) { console.error('❌ Admin message failed:', e.message); }
}

// Guard: only allow admin chat ID to run admin commands
function isAdmin(chatId) {
    return String(chatId) === String(ADMIN_CHAT_ID);
}

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
// BOT HANDLERS
// ==========================================
bot.on('error', (e) => console.error('Bot error:', e?.message));
bot.on('polling_error', (e) => console.error('Polling error:', e?.message));

function setupCommandHandlers() {

    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, `👋 Welcome to Elite Investment Platform!\n\nYour Chat ID: ${msg.chat.id}\n\nAdmin Commands:\n/add_profit <amount>\n/pending_investments\n/approve_investment <id>\n/pending_withdrawals\n/approve_withdrawal <id>\n/confirm_paid <id>\n/stats\n/announce <title> | <message>\n/help`);
    });

    bot.onText(/\/help/, (msg) => {
        bot.sendMessage(msg.chat.id, `📚 Commands:\n\n💰 /add_profit <amount>\n📋 /pending_investments\n✅ /approve_investment <id>\n📋 /pending_withdrawals\n✅ /approve_withdrawal <id>\n💸 /confirm_paid <id>\n📊 /stats\n📢 /announce <title> | <message>`);
    });

    bot.onText(/\/add_profit\s+(\d+)/, async (msg, match) => {
        if (!isAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
        const profit = parseInt(match[1]);
        try {
            const result = await db.addDailyProfit(profit);
            let summary = `✅ Profit of ${profit.toLocaleString()} KES distributed!\n\nDistributed ${result.totalDistributed.toLocaleString()} KES to ${result.distributions.length} investors:\n\n`;
            result.distributions.slice(0, 10).forEach(d => {
                summary += `• ${d.name} [${d.tier}${d.reinvested ? ' 🔄' : ''}]: +${d.amount.toLocaleString()} KES\n`;
            });
            if (result.distributions.length > 10) summary += `...and ${result.distributions.length - 10} more`;
            bot.sendMessage(msg.chat.id, summary);
        } catch (e) {
            bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`);
        }
    });

    bot.onText(/\/pending_investments/, async (msg) => {
        if (!isAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
        try {
            const pending = await db.getPendingInvestments();
            if (!pending.length) return bot.sendMessage(msg.chat.id, '✅ No pending investments!');
            let message = `📋 Pending Investments (${pending.length}):\n\n`;
            pending.forEach((inv, i) => {
                message += `${i + 1}. ${inv.investorName}\n   💰 ${inv.amount.toLocaleString()} KES | 📱 ${inv.phone}\n   ID: ${inv._id}\n   👉 /approve_investment ${inv._id}\n\n`;
            });
            bot.sendMessage(msg.chat.id, message);
        } catch (e) { bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`); }
    });

    bot.onText(/\/approve_investment\s+(\S+)/, async (msg, match) => {
        if (!isAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
        try {
            const inv = await db.approveInvestment(match[1]);
            bot.sendMessage(msg.chat.id, `✅ Investment of ${inv.amount.toLocaleString()} KES approved for ${inv.investorName}!`);
        } catch (e) { bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`); }
    });

    bot.onText(/\/pending_withdrawals/, async (msg) => {
        if (!isAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
        try {
            const pending = await db.getPendingWithdrawals();
            if (!pending.length) return bot.sendMessage(msg.chat.id, '✅ No pending withdrawals!');
            let message = `📋 Pending Withdrawals (${pending.length}):\n\n`;
            pending.forEach((wd, i) => {
                message += `${i + 1}. ${wd.investorName}\n   💸 ${wd.amount.toLocaleString()} KES | 💳 ${wd.mpesaNumber}\n   ID: ${wd._id}\n   👉 /approve_withdrawal ${wd._id}\n\n`;
            });
            bot.sendMessage(msg.chat.id, message);
        } catch (e) { bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`); }
    });

    bot.onText(/\/approve_withdrawal\s+(\S+)/, async (msg, match) => {
        if (!isAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
        try {
            const wd = await db.approveWithdrawal(match[1]);
            bot.sendMessage(msg.chat.id, `✅ Withdrawal approved!\nAmount: ${wd.amount.toLocaleString()} KES\nM-Pesa: ${wd.mpesaNumber}\n\nSend payment then:\n/confirm_paid ${match[1]}`);
        } catch (e) { bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`); }
    });

    bot.onText(/\/confirm_paid\s+(\S+)/, async (msg, match) => {
        if (!isAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
        try {
            await db.confirmWithdrawalPaid(match[1]);
            bot.sendMessage(msg.chat.id, '✅ Withdrawal marked as paid and balance deducted!');
        } catch (e) { bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`); }
    });

    bot.onText(/\/stats/, async (msg) => {
        if (!isAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
        try {
            const s = await db.getStats();
            bot.sendMessage(msg.chat.id, `📊 Platform Stats:\n\n💼 Total Invested: ${s.totalInvested.toLocaleString()} KES\n👥 Active Investors: ${s.totalInvestors}\n⏳ Pending Withdrawals: ${s.pendingWithdrawals} (${s.pendingAmount.toLocaleString()} KES)\n\n🥉 Bronze: ${s.tierBreakdown.Bronze}\n🥈 Silver: ${s.tierBreakdown.Silver}\n🥇 Gold: ${s.tierBreakdown.Gold}`);
        } catch (e) { bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`); }
    });

    // New: /announce Title | Message
    bot.onText(/\/announce (.+)/, async (msg, match) => {
        if (!isAdmin(msg.chat.id)) return bot.sendMessage(msg.chat.id, '❌ Unauthorized');
        const parts = match[1].split('|');
        if (parts.length < 2) return bot.sendMessage(msg.chat.id, 'Usage: /announce Title | Message body');
        try {
            await db.createAnnouncement(parts[0].trim(), parts[1].trim());
            bot.sendMessage(msg.chat.id, '✅ Announcement posted to all investors!');
        } catch (e) { bot.sendMessage(msg.chat.id, `❌ Error: ${e.message}`); }
    });
}

setupCommandHandlers();

// ==========================================
// API ENDPOINTS
// ==========================================

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { phone, name, password, referralCode } = req.body;
        const user = await db.createInvestor(phone, name, password, referralCode || null);
        res.json({ success: true, user });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await db.loginInvestor(phone, password);
        res.json({ success: true, user });
    } catch (e) { res.status(401).json({ error: e.message }); }
});

// Dashboard
app.get('/api/dashboard/:userId', async (req, res) => {
    try {
        const data = await db.getInvestorDashboard(req.params.userId);
        res.json(data);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Request investment
app.post('/api/request-investment', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const request = await db.createInvestmentRequest(userId, amount);
        const investor = await db.getInvestor(userId);
        await sendToAdmin(`🔔 NEW DEPOSIT REQUEST\n\n👤 ${investor.name}\n📱 ${investor.phone}\n💰 ${amount.toLocaleString()} KES\n\nApprove:\n/approve_investment ${request.id}`);
        res.json({ success: true, request });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Request withdrawal
app.post('/api/request-withdrawal', async (req, res) => {
    try {
        const { userId, amount, mpesaNumber } = req.body;
        const request = await db.createWithdrawalRequest(userId, amount, mpesaNumber);
        const investor = await db.getInvestor(userId);
        await sendToAdmin(`🔔 NEW WITHDRAWAL REQUEST\n\n👤 ${investor.name}\n📱 ${investor.phone}\n💸 ${amount.toLocaleString()} KES\n💳 M-Pesa: ${mpesaNumber}\n\nApprove:\n/approve_withdrawal ${request.id}\n\nThen confirm:\n/confirm_paid ${request.id}`);
        res.json({ success: true, request });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Investment history
app.get('/api/investments/:userId', async (req, res) => {
    try {
        const data = await db.getInvestmentHistory(req.params.userId);
        res.json(data);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Withdrawal history
app.get('/api/withdrawals/:userId', async (req, res) => {
    try {
        const data = await db.getWithdrawalHistory(req.params.userId);
        res.json(data);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Toggle auto-reinvest
app.post('/api/reinvest', async (req, res) => {
    try {
        const { userId, enabled } = req.body;
        await db.setAutoReinvest(userId, enabled);
        res.json({ success: true, autoReinvest: enabled });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Public proof-of-earnings
app.get('/api/proof-of-earnings', async (req, res) => {
    try {
        const records = await db.getRecentEarningsPublic(30);
        res.json(records);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Announcements
app.get('/api/announcements', async (req, res) => {
    try {
        const data = await db.getAnnouncements();
        res.json(data);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Referral leaderboard
app.get('/api/referral-leaderboard', async (req, res) => {
    try {
        const data = await db.getReferralLeaderboard();
        res.json(data);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// Referral payouts for a user
app.get('/api/referral-payouts/:userId', async (req, res) => {
    try {
        const data = await db.getReferralPayouts(req.params.userId);
        res.json(data);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// ROI Calculator (public)
app.get('/api/roi-calculator', (req, res) => {
    const { amount, days } = req.query;
    const amt = parseFloat(amount) || 0;
    const d = parseInt(days) || 30;
    const { TIERS } = db;
    const tier = db.getTier(amt);
    // Illustrative: assume 2% base daily return
    const dailyRate = 0.02;
    const projected = Math.round(amt * dailyRate * d * tier.multiplier);
    res.json({ amount: amt, days: d, tier: tier.name, projectedEarnings: projected, tierMultiplier: tier.multiplier });
});

// Export investor data as CSV (admin)
app.get('/api/export-investors', async (req, res) => {
    try {
        const data = await db.exportInvestorsData();
        const headers = ['Name', 'Phone', 'Tier', 'Total Investment (KES)', 'Total Earnings (KES)', 'Available Balance (KES)', 'Referrals', 'Referral Earnings (KES)', 'Auto-Reinvest', 'Joined'];
        const rows = data.map(d => [d.name, d.phone, d.tier, d.totalInvestment, d.totalEarnings, d.availableBalance, d.referralCount, d.referralEarnings, d.autoReinvest, d.joinedAt]);
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="investors.csv"');
        res.send(csv);
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// PDF Statement for investor (server-side HTML to be printed client-side)
app.get('/api/statement/:userId', async (req, res) => {
    try {
        const [dashboard, investments, withdrawals] = await Promise.all([
            db.getInvestorDashboard(req.params.userId),
            db.getInvestmentHistory(req.params.userId),
            db.getWithdrawalHistory(req.params.userId)
        ]);

        const invRows = investments.map(i => `<tr><td>${new Date(i.requestedAt).toLocaleDateString()}</td><td>Deposit</td><td style="color:green">+${i.amount.toLocaleString()} KES</td><td>${i.status}</td></tr>`).join('');
        const wdRows = withdrawals.map(w => `<tr><td>${new Date(w.requestedAt).toLocaleDateString()}</td><td>Withdrawal</td><td style="color:red">-${w.amount.toLocaleString()} KES</td><td>${w.status}</td></tr>`).join('');

        res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Statement - ${dashboard.name}</title>
<style>
  body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
  h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
  .info-box { background: #f3f4f6; padding: 15px; border-radius: 8px; }
  .info-box label { font-size: 12px; color: #6b7280; display: block; }
  .info-box span { font-size: 20px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #667eea; color: white; padding: 10px; text-align: left; }
  td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
  .tier-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; background: #fef3c7; color: #92400e; }
  @media print { button { display: none; } }
</style>
</head><body>
<h1>💼 Elite Investment — Account Statement</h1>
<p>Generated: ${new Date().toLocaleString()} | Investor: <strong>${dashboard.name}</strong></p>
<div class="info-grid">
  <div class="info-box"><label>Total Investment</label><span>${dashboard.totalInvestment.toLocaleString()} KES</span></div>
  <div class="info-box"><label>Total Earnings</label><span>${dashboard.totalEarnings.toLocaleString()} KES</span></div>
  <div class="info-box"><label>Available Balance</label><span>${dashboard.availableBalance.toLocaleString()} KES</span></div>
  <div class="info-box"><label>Tier</label><span class="tier-badge">${dashboard.tier.emoji} ${dashboard.tier.name}</span></div>
</div>
<h2>📋 Transaction History</h2>
<table><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
<tbody>${invRows}${wdRows}</tbody></table>
<br><button onclick="window.print()" style="padding:10px 20px;background:#667eea;color:white;border:none;border-radius:8px;cursor:pointer;font-size:15px;">🖨️ Print / Save PDF</button>
</body></html>`);
    } catch (e) { res.status(400).send('Error generating statement: ' + e.message); }
});

// Serve main HTML
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'investment-platform.html')));

// ==========================================
// TELEGRAM WEBHOOK
// ==========================================
app.post(`/bot${BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ==========================================
// START
// ==========================================
async function startServer() {
    try {
        console.log('⏳ Connecting to database...');
        await db.connect();
        dbReady = true;
        console.log('✅ Database ready!');

        if (WEBHOOK_URL !== `http://localhost:${PORT}`) {
            await bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);
            console.log(`📡 Webhook set: ${WEBHOOK_URL}/bot${BOT_TOKEN}`);
        }

        app.listen(PORT, () => {
            console.log(`\n╔════════════════════════════════════════╗`);
            console.log(`║  ✅ ELITE INVESTMENT PLATFORM RUNNING   ║`);
            console.log(`║  🌐 http://localhost:${PORT}               ║`);
            console.log(`║  🤖 Telegram Bot: Connected             ║`);
            console.log(`║  💾 MongoDB: Connected                  ║`);
            console.log(`╚════════════════════════════════════════╝\n`);
        });
    } catch (e) {
        console.error('❌ Failed to start:', e.message);
        process.exit(1);
    }
}

startServer();
module.exports = app;
