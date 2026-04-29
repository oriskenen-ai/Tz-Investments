# 🚀 Investment Platform - Simplified Version

A clean, simple, production-ready investment platform built following the Halopesa structure.

**Status:** ✅ Production Ready  
**Complexity:** ⭐ (Simple & Clean)  
**Files:** Only 5 core files!  
**Setup Time:** ~10 minutes  

---

## 🎯 Key Features

- 👥 Investor registration & login
- 💰 Investment deposits
- 💸 Withdrawals
- 📊 Dashboard with real-time balance
- 🤖 Telegram admin bot
- 💻 Automatic profit distribution
- 🌐 Ready for Render deployment
- 📱 Fully responsive design

---

## 📁 Files

```
investment-platform-simplified/
├── server.js                  (Express server + Bot)
├── database.js                (MongoDB operations)
├── investment-platform.html   (Frontend - single file)
├── package.json              (Dependencies)
├── .env.example              (Configuration)
├── QUICK_START.md            (Setup guide)
└── README.md                 (This file)
```

**That's all you need!**

---

## ⚡ Quick Start

```bash
# 1. Setup
cp .env.example .env
# Edit .env with your credentials

# 2. Install
npm install

# 3. Run
npm start

# 4. Open
# http://localhost:3000
```

---

## 🔑 Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_bot_token
SUPER_ADMIN_CHAT_ID=your_chat_id
MONGODB_URI=your_mongodb_uri
PORT=3000
APP_URL=http://localhost:3000
```

---

## 🤖 Bot Commands

```
/start                    - Welcome
/help                     - Help menu
/add_profit <amount>      - Add daily profit
/pending_investments      - View pending
/approve_investment <id>  - Approve
/pending_withdrawals      - View withdrawals
/approve_withdrawal <id>  - Approve withdrawal
/confirm_paid <id>        - Mark as paid
/stats                    - Statistics
```

---

## 💰 Workflow

**For Investors:**
1. Register with phone number
2. Request deposit
3. Send money to M-Pesa number
4. Admin approves
5. See investment in dashboard
6. Earn daily profits automatically
7. Request withdrawal anytime

**For Admin:**
1. Receive deposit request (Telegram)
2. Verify payment
3. `/approve_investment id`
4. Every day: `/add_profit amount`
5. System auto-distributes to all investors
6. Investors request withdrawal
7. You send M-Pesa
8. `/confirm_paid id`

---

## 🌐 Deploy to Render

1. Push to GitHub
2. Create Render Web Service
3. Connect repo
4. Set environment variables
5. Deploy!

**Takes ~30 minutes. Completely FREE to start!**

---

## 📊 API Endpoints

```
POST   /api/register              Create account
POST   /api/login                 Login
GET    /api/dashboard/:userId     Dashboard data
POST   /api/request-investment    Request deposit
POST   /api/request-withdrawal    Request withdrawal
GET    /api/investments/:userId   Investment history
GET    /api/withdrawals/:userId   Withdrawal history
```

---

## 💻 Tech Stack

- **Backend:** Node.js + Express.js
- **Frontend:** HTML + CSS + JavaScript (single file)
- **Database:** MongoDB
- **Bot:** Telegram Bot API
- **Hosting:** Render (recommended)
- **Cost:** FREE to start!

---

## 🎯 Why Simplified?

✅ **Easy to understand** - Only 5 files  
✅ **Fast to deploy** - Ready for production  
✅ **Simple to modify** - Well-organized code  
✅ **Perfect starting point** - Scale later  
✅ **Following best practices** - Like Halopesa structure  

---

## 🚀 Production Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Telegram bot token obtained
- [ ] Environment variables configured
- [ ] Code tested locally
- [ ] GitHub repository created
- [ ] Render account created
- [ ] Website deployed
- [ ] Bot connected
- [ ] All features tested
- [ ] Ready for real investors!

---

## 📞 Customization

### Change Colors
Edit `investment-platform.html`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Change Company Name
Edit `investment-platform.html`:
```html
<h1>🚀 Your Company Name</h1>
```

### Change M-Pesa Number
Edit `investment-platform.html`:
```html
<strong>0712345678</strong>
```

---

## 💡 Tips

1. **Local Testing:** Use MongoDB local or Atlas
2. **Bot Development:** Use polling (default)
3. **Production:** Use webhooks (Render)
4. **Security:** Change JWT_SECRET in production
5. **Backups:** Enable MongoDB Atlas backups
6. **Monitoring:** Check Render logs daily

---

## 🆘 Troubleshooting

### "Cannot connect to MongoDB"
→ Check MONGODB_URI in .env

### "Bot not responding"
→ Check TELEGRAM_BOT_TOKEN in .env

### "Website won't load"
→ Check PORT is available
→ Try `PORT=4000 npm start`

### "Deployment failed"
→ Check build command: `npm install`
→ Check start command: `npm start`

---

## 📈 Scaling Later

When you grow:
1. Add more collections
2. Implement caching
3. Add rate limiting
4. Upgrade to paid Render tier
5. Add more features
6. Scale database

**Start simple, scale smart!**

---

## 🎉 Ready to Launch!

Your platform is production-ready:
- ✅ Clean code structure
- ✅ Secure authentication
- ✅ Real-time updates
- ✅ Admin Telegram bot
- ✅ Automatic calculations
- ✅ Responsive design

**Start accepting investors today!** 🚀

---

## 📝 License

MIT License - Feel free to use and modify

---

## 🙏 Credits

Built following the Halopesa architecture - clean, simple, production-ready.

---

**Last Updated:** April 28, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready  

Happy launching! 🚀
