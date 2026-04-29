const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
require('dotenv').config();

const db = require('./database');

const app = express();

// ==========================================
// TELEGRAM BOT SETUP (Webhook Mode)
// ==========================================

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL || `http://localhost:${PORT}`;

// Create bot WITHOUT polling (webhook mode for Render)
const bot = new TelegramBot(BOT_TOKEN);

// In-memory storage
const adminChatIds = new Map(); // adminId → chatId
const investors = new Map(); // userId → investor data
const pendingApprovals = new Map(); // requestId → request data

let dbReady = false;

// ==========================================
// HELPER FUNCTIONS
// ==========================================

async function sendToAdmin(adminId, message, options = {}) {
    const chatId = adminChatIds.get(adminId);
    if (!chatId) {
        try {
            const admin = await db.getAdmin(adminId);
            if (!admin?.chatId) return null;
            adminChatIds.set(adminId, admin.chatId);
            return await bot.sendMessage(admin.chatId, message, options);
        } catch (err) {
            console.error(`❌ Error for admin ${adminId}:`, err.message);
            return null;
        }
    }
    try {
        return await bot.sendMessage(chatId, message, options);
    } catch (error) {
        console.error(`❌ Send error:`, error.message);
        return null;
    }
}

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
// BOT COMMAND HANDLERS
// ==========================================

console.log('⏳ Setting up bot handlers...');

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
👋 Welcome to Investment Platform!

Available Commands:
/add_profit <amount> - Add daily profit
/pending_investments - View pending investments
/approve_investment <id> - Approve investment
/pending_withdrawals - View pending withdrawals
/approve_withdrawal <id> - Approve withdrawal
/confirm_paid <id> - Mark withdrawal as paid
/stats - View platform statistics
/help - Show this menu
    `);
});

bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `
📚 Available Commands:

💰 PROFIT:
/add_profit <amount> - Add daily profit

📊 INVESTMENTS:
/pending_investments - View pending investments
/approve_investment <id> - Approve investment

💳 WITHDRAWALS:
/pending_withdrawals - View pending withdrawals
/approve_withdrawal <id> - Approve withdrawal
/confirm_paid <id> - Mark as paid

📈 STATISTICS:
/stats - Platform statistics
    `);
});

bot.onText(/\/add_profit\s+(\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const profit = parseInt(match[1]);

    try {
        await db.addDailyProfit(profit);
        
        // Get all investors and calculate earnings
        const allInvestors = await db.getAllInvestors();
        const totalPool = allInvestors.reduce((sum, inv) => sum + inv.totalInvestment, 0);
        
        if (totalPool === 0) {
            bot.sendMessage(chatId, '❌ No investments yet');
            return;
        }

        // Distribute profits
        for (const investor of allInvestors) {
            const share = (investor.totalInvestment / totalPool) * profit;
            await db.addEarnings(investor.userId, share);
        }

        bot.sendMessage(chatId, `
✅ Profit Added!

Amount: ${profit.toLocaleString()} KES
Distributed to: ${allInvestors.length} investors
        `);
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/pending_investments/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const pending = await db.getPendingInvestments();
        if (pending.length === 0) {
            bot.sendMessage(chatId, '✅ No pending investments!');
            return;
        }

        let message = `📋 Pending Investments (${pending.length}):\n\n`;
        pending.forEach((inv, idx) => {
            message += `${idx + 1}. ${inv.investorName}\n`;
            message += `   Amount: ${inv.amount.toLocaleString()} KES\n`;
            message += `   Phone: ${inv.phone}\n\n`;
        });

        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/approve_investment\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const investmentId = match[1];

    try {
        await db.approveInvestment(investmentId);
        bot.sendMessage(chatId, '✅ Investment approved!');
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/pending_withdrawals/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const pending = await db.getPendingWithdrawals();
        if (pending.length === 0) {
            bot.sendMessage(chatId, '✅ No pending withdrawals!');
            return;
        }

        let message = `📋 Pending Withdrawals (${pending.length}):\n\n`;
        pending.forEach((wd, idx) => {
            message += `${idx + 1}. ${wd.investorName}\n`;
            message += `   Amount: ${wd.amount.toLocaleString()} KES\n`;
            message += `   M-Pesa: ${wd.mpesaNumber}\n\n`;
        });

        bot.sendMessage(chatId, message);
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/approve_withdrawal\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const withdrawalId = match[1];

    try {
        const wd = await db.approveWithdrawal(withdrawalId);
        bot.sendMessage(chatId, `
✅ Withdrawal Approved!

Amount: ${wd.amount.toLocaleString()} KES
M-Pesa: ${wd.mpesaNumber}

Send payment and then use:
/confirm_paid ${withdrawalId}
        `);
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/confirm_paid\s+(\S+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const withdrawalId = match[1];

    try {
        await db.confirmWithdrawalPaid(withdrawalId);
        bot.sendMessage(chatId, '✅ Withdrawal marked as paid!');
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

bot.onText(/\/stats/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const stats = await db.getStats();
        bot.sendMessage(chatId, `
📊 Platform Statistics:

💼 Total Invested: ${stats.totalInvested.toLocaleString()} KES
👥 Total Investors: ${stats.totalInvestors}
⏳ Pending Withdrawals: ${stats.pendingWithdrawals}
💰 Pending Amount: ${stats.pendingAmount.toLocaleString()} KES
        `);
    } catch (error) {
        bot.sendMessage(chatId, `❌ Error: ${error.message}`);
    }
});

console.log('✅ Bot handlers configured!');

// ==========================================
// API ENDPOINTS
// ==========================================

// Register investor
app.post('/api/register', async (req, res) => {
    try {
        const { phone, name, password } = req.body;
        const user = await db.createInvestor(phone, name, password);
        res.json({ success: true, user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { phone, password } = req.body;
        const user = await db.loginInvestor(phone, password);
        res.json({ success: true, user });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Get dashboard data
app.get('/api/dashboard/:userId', async (req, res) => {
    try {
        const data = await db.getInvestorDashboard(req.params.userId);
        res.json(data);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Request investment
app.post('/api/request-investment', async (req, res) => {
    try {
        const { userId, amount } = req.body;
        const request = await db.createInvestmentRequest(userId, amount);
        res.json({ success: true, request });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Request withdrawal
app.post('/api/request-withdrawal', async (req, res) => {
    try {
        const { userId, amount, mpesaNumber } = req.body;
        const request = await db.createWithdrawalRequest(userId, amount, mpesaNumber);
        res.json({ success: true, request });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get investment history
app.get('/api/investments/:userId', async (req, res) => {
    try {
        const investments = await db.getInvestmentHistory(req.params.userId);
        res.json(investments);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get withdrawal history
app.get('/api/withdrawals/:userId', async (req, res) => {
    try {
        const withdrawals = await db.getWithdrawalHistory(req.params.userId);
        res.json(withdrawals);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Serve main HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'investment-platform.html'));
});

// ==========================================
// BOT WEBHOOK SETUP
// ==========================================

app.post(`/bot${BOT_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// ==========================================
// DATABASE INITIALIZATION & SERVER START
// ==========================================

async function startServer() {
    try {
        console.log('⏳ Initializing database...');
        await db.connect();
        dbReady = true;
        console.log('✅ Database ready!');

        // Set webhook for Render
        if (WEBHOOK_URL !== `http://localhost:${PORT}`) {
            console.log(`📡 Setting webhook to ${WEBHOOK_URL}/bot${BOT_TOKEN}`);
            await bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);
        }

        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════╗
║  ✅ INVESTMENT PLATFORM IS RUNNING!      ║
║                                           ║
║  🌐 Website: http://localhost:${PORT}      ║
║  🤖 Bot: Connected                        ║
║  💾 Database: Connected                   ║
╚═══════════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

startServer();

module.exports = app;
