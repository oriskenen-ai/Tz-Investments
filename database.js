const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

let db = null;
let investorsCollection = null;
let investmentsCollection = null;
let withdrawalsCollection = null;
let earningsCollection = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'investment-platform';

// ==========================================
// CONNECTION
// ==========================================

async function connect() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    
    investorsCollection = db.collection('investors');
    investmentsCollection = db.collection('investments');
    withdrawalsCollection = db.collection('withdrawals');
    earningsCollection = db.collection('earnings');
    
    // Create indexes
    await investorsCollection.createIndex({ phone: 1 }, { unique: true });
    await investmentsCollection.createIndex({ userId: 1 });
    await withdrawalsCollection.createIndex({ userId: 1 });
    await earningsCollection.createIndex({ userId: 1, date: 1 });
    
    console.log('✅ Connected to MongoDB');
}

// ==========================================
// INVESTOR FUNCTIONS
// ==========================================

async function createInvestor(phone, name, password) {
    const existing = await investorsCollection.findOne({ phone });
    if (existing) throw new Error('Phone already registered');
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await investorsCollection.insertOne({
        phone,
        name,
        password: hashedPassword,
        totalInvestment: 0,
        totalEarnings: 0,
        referralCode: 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        createdAt: new Date()
    });
    
    return {
        id: result.insertedId,
        phone,
        name
    };
}

async function loginInvestor(phone, password) {
    const investor = await investorsCollection.findOne({ phone });
    if (!investor) throw new Error('Investor not found');
    
    const validPassword = await bcrypt.compare(password, investor.password);
    if (!validPassword) throw new Error('Invalid password');
    
    return {
        id: investor._id,
        phone: investor.phone,
        name: investor.name
    };
}

async function getInvestor(userId) {
    return await investorsCollection.findOne({ _id: new ObjectId(userId) });
}

async function getAllInvestors() {
    return await investorsCollection.find({ totalInvestment: { $gt: 0 } }).toArray();
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
    
    const available = investor.totalEarnings + investor.totalInvestment;
    if (amount > available) throw new Error('Insufficient balance');
    
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
    
    // Deduct from investor balance
    const investor = await getInvestor(withdrawal.userId.toString());
    let deductFromEarnings = Math.min(withdrawal.amount, investor.totalEarnings);
    let deductFromInvestment = withdrawal.amount - deductFromEarnings;
    
    await investorsCollection.updateOne(
        { _id: withdrawal.userId },
        { 
            $inc: { 
                totalEarnings: -deductFromEarnings,
                totalInvestment: -deductFromInvestment
            }
        }
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
    const result = await earningsCollection.insertOne({
        date: new Date(),
        profit,
        distributed: false
    });
    return result;
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

// ==========================================
// DASHBOARD FUNCTIONS
// ==========================================

async function getInvestorDashboard(userId) {
    const investor = await getInvestor(userId);
    if (!investor) throw new Error('Investor not found');
    
    return {
        name: investor.name,
        phone: investor.phone,
        totalInvestment: investor.totalInvestment,
        totalEarnings: investor.totalEarnings,
        availableBalance: investor.totalInvestment + investor.totalEarnings,
        referralCode: investor.referralCode,
        createdAt: investor.createdAt
    };
}

// ==========================================
// ADMIN FUNCTIONS
// ==========================================

async function getStats() {
    const investors = await getAllInvestors();
    const totalInvested = investors.reduce((sum, inv) => sum + inv.totalInvestment, 0);
    const pendingWithdrawals = await withdrawalsCollection.countDocuments({ status: 'pending' });
    const withdrawals = await withdrawalsCollection.find({ status: 'pending' }).toArray();
    const pendingAmount = withdrawals.reduce((sum, wd) => sum + wd.amount, 0);
    
    return {
        totalInvested,
        totalInvestors: investors.length,
        pendingWithdrawals,
        pendingAmount
    };
}

async function getAdmin(adminId) {
    // In production, you'd query this from DB
    // For now, return from environment
    return {
        adminId,
        chatId: process.env.SUPER_ADMIN_CHAT_ID
    };
}

module.exports = {
    connect,
    // Investors
    createInvestor,
    loginInvestor,
    getInvestor,
    getAllInvestors,
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
    // Dashboard
    getInvestorDashboard,
    // Admin
    getStats,
    getAdmin
};
