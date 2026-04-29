# 🚀 Investment Platform - Simplified Version

**Much simpler than the original! Same functionality, cleaner structure.**

---

## 📁 File Structure (Only 5 Files!)

```
investment-platform-simplified/
├── server.js                  (Main server - handles API + Bot)
├── database.js                (MongoDB operations)
├── investment-platform.html   (Frontend - single HTML file)
├── package.json              (Dependencies)
└── .env.example              (Configuration template)
```

**That's it! Super clean and simple to understand.** 🎉

---

## ⚡ Quick Start (10 minutes)

### 1. Setup (.env)
```bash
cp .env.example .env
```

Edit `.env`:
```
TELEGRAM_BOT_TOKEN=your_bot_token
SUPER_ADMIN_CHAT_ID=your_chat_id
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority
PORT=3000
APP_URL=http://localhost:3000
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Server
```bash
npm start
```

### 4. Open Browser
```
http://localhost:3000
```

**Done! Your platform is running!** ✅

---

## 🎯 How It Works

### **Frontend** (Single HTML File)
- Login/Register forms
- Dashboard with stats
- Deposit/Withdraw forms
- History tables
- All in one beautiful HTML file!

### **Backend** (Express Server)
- RESTful API endpoints
- Telegram bot integration
- Database operations
- Webhook support for Render

### **Database** (MongoDB)
- Investors collection
- Investments collection
- Withdrawals collection
- Earnings collection

### **Bot** (Telegram)
- /start - Welcome message
- /add_profit - Admin adds profit
- /pending_investments - View pending
- /approve_investment - Approve deposit
- /pending_withdrawals - View withdrawals
- /approve_withdrawal - Approve withdrawal
- /confirm_paid - Mark as paid
- /stats - View statistics

---

## 📊 Features

✅ **Investor Features:**
- Register with phone
- Login securely
- Dashboard with balance
- Request deposits
- Request withdrawals
- View history

✅ **Admin Features (Telegram Bot):**
- Add daily profit
- Approve investments
- Approve withdrawals
- Track statistics

✅ **Automatic Profit Distribution:**
- Admin enters daily profit
- System calculates each investor's share
- Updates displayed in real-time

---

## 🌐 Deploy to Render (30 Minutes)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Investment platform"
git push origin main
```

### Step 2: Create Render Service
1. Go to https://render.com
2. New Web Service
3. Connect GitHub
4. Configure:
   - Build: `npm install`
   - Start: `npm start`
5. Add environment variables from .env
6. Deploy!

### Step 3: Get Your URLs
```
Website: https://your-app.onrender.com
API: https://your-app.onrender.com/api
Bot: Telegram @yourbot
```

**Live on internet!** 🌍

---

## 💾 Cost on Render

| Service | Free | Paid |
|---------|------|------|
| Website | YES | $3/month |
| Bot (local) | YES | - |
| Bot (24/7) | NO | $7/month |
| Database | FREE | $9/month |
| **TOTAL** | **$0** | **Starting $7** |

---

## 🔄 API Endpoints

```
POST   /api/register              → Create account
POST   /api/login                 → Login
GET    /api/dashboard/:userId     → Get dashboard data
POST   /api/request-investment    → Request deposit
POST   /api/request-withdrawal    → Request withdrawal
GET    /api/investments/:userId   → Investment history
GET    /api/withdrawals/:userId   → Withdrawal history
```

---

## 🤖 Telegram Bot Commands

```
/start                          → Welcome
/help                           → Help menu
/add_profit 100000              → Add daily profit
/pending_investments            → View pending
/approve_investment id          → Approve
/pending_withdrawals            → View withdrawals
/approve_withdrawal id          → Approve
/confirm_paid id                → Mark paid
/stats                          → Statistics
```

---

## ⚙️ How Profit Distribution Works

**Example:**

1. Total investors: 2
   - Investor A: 500,000 KES (50%)
   - Investor B: 500,000 KES (50%)

2. Daily profit: 100,000 KES

3. Admin runs: `/add_profit 100000`

4. System calculates:
   - Investor A gets: 50,000 KES
   - Investor B gets: 50,000 KES

5. All updated in real-time on dashboard!

---

## 🔐 Admin Setup

When deploying:

1. Create admin account with bot
2. Set SUPER_ADMIN_CHAT_ID in .env
3. Bot sends commands directly to your Telegram
4. You manage everything from Telegram!

---

## 📱 Testing Locally

```bash
# Terminal 1 - Start MongoDB (if local)
mongod

# Terminal 2 - Start server
npm start

# Terminal 3 - (Optional) Setup bot
# Create bot with @BotFather
# Get token and chat ID
# Add to .env
```

Then:
- Open http://localhost:3000
- Register as investor
- Request deposit
- Test bot commands
- Everything works!

---

## 🚀 Production Checklist

- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] MongoDB Atlas cluster created
- [ ] Environment variables configured
- [ ] Telegram bot token obtained
- [ ] Render account created
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Render
- [ ] Bot connected to Telegram
- [ ] Tested all features
- [ ] Ready for investors!

---

## 🛠️ Common Issues

### MongoDB Connection Error
```
Solution: Check MONGODB_URI in .env
Make sure connection string is correct
```

### Bot Not Responding
```
Solution: Check TELEGRAM_BOT_TOKEN in .env
Restart server: npm start
```

### Website Won't Load
```
Solution: Check PORT is not in use
Try: PORT=4000 npm start
```

---

## 📚 File Explanations

### server.js
- Express app setup
- All API endpoints
- Telegram bot handlers
- Webhook configuration for Render

### database.js
- MongoDB connection
- All database operations
- Clean, organized functions
- Ready to modify for your needs

### investment-platform.html
- Beautiful, responsive UI
- Login/Register forms
- Dashboard with real-time stats
- Deposit/Withdrawal forms
- All CSS and JS in one file

### package.json
- All dependencies listed
- Start and dev scripts
- Node version requirement

---

## 💡 Customization

### Change Colors
Edit `investment-platform.html` CSS:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Change these hex codes to your colors */
```

### Change Company Name
Edit `investment-platform.html`:
```html
<h1>🚀 Your Company Name</h1>
```

### Change M-Pesa Number
Edit `investment-platform.html`:
```html
<p>Send to: <strong>0712345678</strong></p>
<!-- Change this number -->
```

---

## 🎯 Perfect For

✅ Startups launching quickly
✅ Tight budgets
✅ Simple requirement  
✅ Learning full-stack
✅ MVP / Proof of concept

---

## 🔄 Next Steps

1. **Download** the simplified version
2. **Setup .env** with your credentials
3. **Test locally** with `npm start`
4. **Deploy** to Render (30 minutes)
5. **Share** with investors
6. **Scale** as needed!

---

## 📞 Support

All code is well-commented and organized. Questions? Check:
- server.js comments
- database.js structure
- HTML inline comments
- This guide!

---

## 🎉 You're Ready!

This simplified version is:
- ✅ Production-ready
- ✅ Easy to understand
- ✅ Fast to deploy
- ✅ Simple to modify
- ✅ Perfect for your needs

**Let's launch your platform!** 🚀

---

**Status:** ✅ Ready to Use  
**Build Date:** April 28, 2026  
**Complexity:** ⭐ (Simple & Clean)  
**Deploy Time:** 30 minutes

Enjoy your investment platform!
