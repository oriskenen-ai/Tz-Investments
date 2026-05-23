const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

let db = null;
let investorsCollection = null;
let investmentsCollection = null;
let withdrawalsCollection = null;
let earningsCollection = null;
let announcementsCollection = null;
let referralPayoutsCollection = null;

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'investment-platform';

console.log('🔍 Checking MONGODB_URI...');
console.log('MONGODB_URI set:', !!MONGODB_URI);

if (!MONGODB_URI) {
    console.error('╔════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ CRITICAL ERROR: MONGODB_URI NOT SET                    ║');
    console.error('║  Add MONGODB_URI to your environment variables             ║');
    console.error('╚════════════════════════════════════════════════════════════╝');
    process.exit(1);
}

// ==========================================
// INVESTMENT TIERS
// ==========================================
const TIERS = {
    BRONZE: { name: 'Bronze', min: 0, max: 49999, multiplier: 1.0, color: '#CD7F32', emoji: '🥉' },
    SILVER: { name: 'Silver', min: 50000, max: 199999, multiplier: 1.15, color: '#C0C0C0', emoji: '🥈' },
    GOLD:   { name: 'Gold',   min: 200000, max: Infinity, multiplier: 1.35, color: '#FFD700', emoji: '🥇' }
};

function getTier(totalInvestment) {
    if (totalInvestment >= TIERS.GOLD.min) return TIERS.GOLD;
    if (totalInvestment >= TIERS.SILVER.min) return TIERS.SILVER;
    return TIERS.BRONZE;
}

// Loyalty bonus: extra % per 30 days as active investor
function getLoyaltyMultiplier(createdAt) {
    const months = Math.floor((Date.now() - new Date(createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000));
    return Math.min(months * 0.01, 0.10); // up to +10% after 10 months
}

// ==========================================
// CONNECTION
// ==========================================
async function connect() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);

    investorsCollection      = db.collection('investors');
    investmentsCollection    = db.collection('investments');
    withdrawalsCollection    = db.collection('withdrawals');
    earningsCollection       = db.collection('earnings');
    announcementsCollection  = db.collection('announcements');
    referralPayoutsCollection = db.collection('referralPayouts');

    await investorsCollection.createIndex({ phone: 1 }, { unique: true });
    await investorsCollection.createIndex({ referralCode: 1 }, { unique: true });
    await investmentsCollection.createIndex({ userId: 1 });
    await withdrawalsCollection.createIndex({ userId: 1 });
    await earningsCollection.createIndex({ userId: 1, date: 1 });

    console.log('✅ Connected to MongoDB');
}

// ==========================================
// INVESTOR FUNCTIONS
// ==========================================
async function createInvestor(phone, name, password, referredByCode = null) {
    const existing = await investorsCollection.findOne({ phone });
    if (existing) throw new Error('Phone already registered');

    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const investorDoc = {
        phone, name,
        password: hashedPassword,
        totalInvestment: 0,
        totalEarnings: 0,
        referralCode,
        referredBy: null,       // userId of referrer
        referralCount: 0,       // how many they referred
        referralEarnings: 0,    // total earned from referrals
        autoReinvest: false,    // reinvestment toggle
        createdAt: new Date()
    };

    // Link referral
    if (referredByCode) {
        const referrer = await investorsCollection.findOne({ referralCode: referredByCode });
        if (referrer) {
            investorDoc.referredBy = referrer._id;
        }
    }

    const result = await investorsCollection.insertOne(investorDoc);
    return { id: result.insertedId, phone, name };
}

async function loginInvestor(phone, password) {
    const investor = await investorsCollection.findOne({ phone });
    if (!investor) throw new Error('Investor not found');
    const validPassword = await bcrypt.compare(password, investor.password);
    if (!validPassword) throw new Error('Invalid password');
    return { id: investor._id, phone: investor.phone, name: investor.name };
}

async function getInvestor(userId) {
    return await investorsCollection.findOne({ _id: new ObjectId(userId) });
}

async function getAllInvestors() {
    return await investorsCollection.find({ totalInvestment: { $gt: 0 } }).toArray();
}

async function getAllInvestorsForLeaderboard() {
    return await investorsCollection
        .find({}, { projection: { password: 0 } })
        .sort({ referralCount: -1 })
        .toArray();
}

async function setAutoReinvest(userId, enabled) {
    await investorsCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { autoReinvest: enabled } }
    );
}

// ==========================================
// INVESTMENT FUNCTIONS
// ==========================================
async function createInvestmentRequest(userId, amount) {
    const investor = await getInvestor(userId);
    if (!investor) throw new Error('Investor not found');

    const result = await investmentsCollection.insertOne({
        userId: new ObjectId(userId),
        investorName: investor.name,
        phone: investor.phone,
        amount,
        status: 'pending',
        requestedAt: new Date()
    });

    return { id: result.insertedId, amount, status: 'pending' };
}

async function getPendingInvestments() {
    return await investmentsCollection.find({ status: 'pending' }).toArray();
}

async function approveInvestment(investmentId) {
    const investment = await investmentsCollection.findOne({ _id: new ObjectId(investmentId) });
    if (!investment) throw new Error('Investment not found');

    await investmentsCollection.updateOne(
        { _id: new ObjectId(investmentId) },
        { $set: { status: 'approved', approvedAt: new Date() } }
    );

    await investorsCollection.updateOne(
        { _id: investment.userId },
        { $inc: { totalInvestment: investment.amount } }
    );

    // Pay referral bonus (5%) to referrer if any
    const investor = await investorsCollection.findOne({ _id: investment.userId });
    if (investor && investor.referredBy) {
        const referralBonus = Math.round(investment.amount * 0.05);
        await investorsCollection.updateOne(
            { _id: investor.referredBy },
            { $inc: { totalEarnings: referralBonus, referralEarnings: referralBonus, referralCount: 1 } }
        );
        await referralPayoutsCollection.insertOne({
            referrerId: investor.referredBy,
            refereeId: investment.userId,
            refereeName: investor.name,
            investmentAmount: investment.amount,
            bonusAmount: referralBonus,
            date: new Date()
        });
        // Reset referredBy so we don't pay again on future investments
        await investorsCollection.updateOne(
            { _id: investment.userId },
            { $set: { referredBy: null } }
        );
    }

    return investment;
}

async function getInvestmentHistory(userId) {
    return await investmentsCollection
        .find({ userId: new ObjectId(userId) })
        .sort({ requestedAt: -1 })
        .toArray();
}

// ==========================================
// WITHDRAWAL FUNCTIONS
// ==========================================
async function createWithdrawalRequest(userId, amount, mpesaNumber) {
    const investor = await getInvestor(userId);
    if (!investor) throw new Error('Investor not found');

    // Check pending withdrawals to avoid double-spending
    const pendingWds = await withdrawalsCollection.find({
        userId: new ObjectId(userId),
        status: { $in: ['pending', 'approved'] }
    }).toArray();
    const pendingTotal = pendingWds.reduce((s, w) => s + w.amount, 0);

    const available = investor.totalEarnings + investor.totalInvestment - pendingTotal;
    if (amount > available) throw new Error('Insufficient balance (pending withdrawals deducted)');

    const result = await withdrawalsCollection.insertOne({
        userId: new ObjectId(userId),
        investorName: investor.name,
        phone: investor.phone,
        mpesaNumber,
        amount,
        status: 'pending',
        requestedAt: new Date()
    });

    return { id: result.insertedId, amount, status: 'pending' };
}

async function getPendingWithdrawals() {
    return await withdrawalsCollection.find({ status: 'pending' }).toArray();
}

async function approveWithdrawal(withdrawalId) {
    const withdrawal = await withdrawalsCollection.findOne({ _id: new ObjectId(withdrawalId) });
    if (!withdrawal) throw new Error('Withdrawal not found');
    await withdrawalsCollection.updateOne(
        { _id: new ObjectId(withdrawalId) },
        { $set: { status: 'approved', approvedAt: new Date() } }
    );
    return withdrawal;
}

async function confirmWithdrawalPaid(withdrawalId) {
    const withdrawal = await withdrawalsCollection.findOne({ _id: new ObjectId(withdrawalId) });
    if (!withdrawal) throw new Error('Withdrawal not found');

    await withdrawalsCollection.updateOne(
        { _id: new ObjectId(withdrawalId) },
        { $set: { status: 'paid', paidAt: new Date() } }
    );

    const investor = await getInvestor(withdrawal.userId.toString());
    let deductFromEarnings = Math.min(withdrawal.amount, investor.totalEarnings);
    let deductFromInvestment = withdrawal.amount - deductFromEarnings;

    await investorsCollection.updateOne(
        { _id: withdrawal.userId },
        { $inc: { totalEarnings: -deductFromEarnings, totalInvestment: -deductFromInvestment } }
    );

    return withdrawal;
}

async function getWithdrawalHistory(userId) {
    return await withdrawalsCollection
        .find({ userId: new ObjectId(userId) })
        .sort({ requestedAt: -1 })
        .toArray();
}

// ==========================================
// EARNINGS FUNCTIONS
// ==========================================
async function addDailyProfit(profit) {
    const allInvestors = await getAllInvestors();
    const totalPool = allInvestors.reduce((sum, inv) => sum + inv.totalInvestment, 0);

    if (totalPool === 0) throw new Error('No investments to distribute to');

    const distributions = [];

    for (const investor of allInvestors) {
        const baseShare = (investor.totalInvestment / totalPool) * profit;
        const tier = getTier(investor.totalInvestment);
        const loyaltyBonus = getLoyaltyMultiplier(investor.createdAt);
        const finalShare = Math.round(baseShare * tier.multiplier * (1 + loyaltyBonus));

        if (investor.autoReinvest) {
            // Reinvest: add directly to totalInvestment instead of earnings
            await investorsCollection.updateOne(
                { _id: investor._id },
                { $inc: { totalInvestment: finalShare } }
            );
        } else {
            await investorsCollection.updateOne(
                { _id: investor._id },
                { $inc: { totalEarnings: finalShare } }
            );
        }

        await earningsCollection.insertOne({
            userId: investor._id,
            investorName: investor.name,
            amount: finalShare,
            reinvested: investor.autoReinvest,
            tier: tier.name,
            date: new Date()
        });

        distributions.push({
            name: investor.name,
            amount: finalShare,
            tier: tier.name,
            reinvested: investor.autoReinvest
        });
    }

    return { distributions, totalDistributed: distributions.reduce((s, d) => s + d.amount, 0) };
}

async function addEarnings(userId, amount) {
    await investorsCollection.updateOne(
        { _id: new ObjectId(userId) },
        { $inc: { totalEarnings: amount } }
    );
    await earningsCollection.insertOne({
        userId: new ObjectId(userId),
        amount,
        date: new Date()
    });
}

async function getRecentEarningsPublic(limit = 20) {
    // Returns anonymized earnings for "proof of earnings" page
    return await earningsCollection
        .find({})
        .sort({ date: -1 })
        .limit(limit)
        .toArray()
        .then(records => records.map(r => ({
            name: r.investorName ? r.investorName.split(' ')[0] + ' ***' : 'Investor',
            amount: r.amount,
            tier: r.tier || 'Bronze',
            date: r.date
        })));
}

// ==========================================
// ANNOUNCEMENTS
// ==========================================
async function createAnnouncement(title, message, adminName = 'Admin') {
    const result = await announcementsCollection.insertOne({
        title, message, adminName,
        createdAt: new Date(),
        active: true
    });
    return result;
}

async function getAnnouncements(limit = 10) {
    return await announcementsCollection
        .find({ active: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
}

// ==========================================
// REFERRAL LEADERBOARD
// ==========================================
async function getReferralLeaderboard() {
    return await investorsCollection
        .find({ referralCount: { $gt: 0 } })
        .sort({ referralCount: -1, referralEarnings: -1 })
        .limit(10)
        .project({ name: 1, referralCount: 1, referralEarnings: 1 })
        .toArray();
}

async function getReferralPayouts(userId) {
    return await referralPayoutsCollection
        .find({ referrerId: new ObjectId(userId) })
        .sort({ date: -1 })
        .toArray();
}

// ==========================================
// DASHBOARD FUNCTIONS
// ==========================================
async function getInvestorDashboard(userId) {
    const investor = await getInvestor(userId);
    if (!investor) throw new Error('Investor not found');

    const tier = getTier(investor.totalInvestment);
    const loyaltyBonus = getLoyaltyMultiplier(investor.createdAt);
    const monthsActive = Math.floor((Date.now() - new Date(investor.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000));

    return {
        name: investor.name,
        phone: investor.phone,
        totalInvestment: investor.totalInvestment,
        totalEarnings: investor.totalEarnings,
        availableBalance: investor.totalInvestment + investor.totalEarnings,
        referralCode: investor.referralCode,
        referralCount: investor.referralCount || 0,
        referralEarnings: investor.referralEarnings || 0,
        autoReinvest: investor.autoReinvest || false,
        createdAt: investor.createdAt,
        tier: {
            name: tier.name,
            emoji: tier.emoji,
            color: tier.color,
            multiplier: tier.multiplier,
            nextTier: tier.name === 'Gold' ? null : (tier.name === 'Silver' ? TIERS.GOLD : TIERS.SILVER),
            amountToNext: tier.name === 'Gold' ? 0 : (tier.name === 'Silver' ? TIERS.GOLD.min - investor.totalInvestment : TIERS.SILVER.min - investor.totalInvestment)
        },
        loyalty: {
            monthsActive,
            bonusPercent: Math.round(loyaltyBonus * 100)
        }
    };
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================
async function getStats() {
    const investors = await getAllInvestors();
    const totalInvested = investors.reduce((sum, inv) => sum + inv.totalInvestment, 0);
    const allWithdrawals = await withdrawalsCollection.find({ status: 'pending' }).toArray();
    const pendingAmount = allWithdrawals.reduce((sum, wd) => sum + wd.amount, 0);

    const tierBreakdown = { Bronze: 0, Silver: 0, Gold: 0 };
    investors.forEach(inv => { tierBreakdown[getTier(inv.totalInvestment).name]++; });

    return {
        totalInvested,
        totalInvestors: investors.length,
        pendingWithdrawals: allWithdrawals.length,
        pendingAmount,
        tierBreakdown
    };
}

// Export investors data for Excel export (used by /api/export-investors)
async function exportInvestorsData() {
    const investors = await investorsCollection
        .find({}, { projection: { password: 0 } })
        .sort({ createdAt: -1 })
        .toArray();

    return investors.map(inv => {
        const tier = getTier(inv.totalInvestment);
        return {
            name: inv.name,
            phone: inv.phone,
            tier: tier.name,
            totalInvestment: inv.totalInvestment,
            totalEarnings: inv.totalEarnings,
            availableBalance: inv.totalInvestment + inv.totalEarnings,
            referralCount: inv.referralCount || 0,
            referralEarnings: inv.referralEarnings || 0,
            autoReinvest: inv.autoReinvest ? 'Yes' : 'No',
            joinedAt: new Date(inv.createdAt).toLocaleDateString()
        };
    });
}

module.exports = {
    connect,
    TIERS,
    getTier,
    // Investors
    createInvestor,
    loginInvestor,
    getInvestor,
    getAllInvestors,
    getAllInvestorsForLeaderboard,
    setAutoReinvest,
    // Investments
    createInvestmentRequest,
    getPendingInvestments,
    approveInvestment,
    getInvestmentHistory,
    // Withdrawals
    createWithdrawalRequest,
    getPendingWithdrawals,
    approveWithdrawal,
    confirmWithdrawalPaid,
    getWithdrawalHistory,
    // Earnings
    addDailyProfit,
    addEarnings,
    getRecentEarningsPublic,
    // Announcements
    createAnnouncement,
    getAnnouncements,
    // Referrals
    getReferralLeaderboard,
    getReferralPayouts,
    // Dashboard
    getInvestorDashboard,
    // Admin
    getStats,
    exportInvestorsData
};
