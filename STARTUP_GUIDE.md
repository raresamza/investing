# Investment Portfolio App - Startup Guide

## ✅ Status
- **Backend**: Built successfully (NestJS) ✓
- **Frontend**: Built successfully (Next.js) ✓
- **Backend Tests**: 78/78 passing ✓
- **Frontend Tests**: 52/52 passing ✓
- **AI Integration**: Ready to connect ✓

---

## Prerequisites
Ensure you have installed:
- **Node.js** (v18+)
- **Python** (v3.11+) - for AI service
- **PostgreSQL** running locally or accessible

---

## 🚀 Quick Start (All Services)

### Terminal 1: Start AI Service
```bash
cd apps\ai
python -m venv .venv          # Create virtual environment (first time only)
.\.venv\Scripts\activate      # Activate virtual environment (Windows)
# On Mac/Linux: source .venv/bin/activate

pip install -r requirements.txt  # Install dependencies (first time only)
python -m src.main
```
Wait for: `Application startup complete`
- AI Service running on: **http://localhost:8000**
- Health check: http://localhost:8000/health

---

### Terminal 2: Start Backend API
```bash
cd apps\api
npm install              # First time only
npm run dev
```
Wait for: `Listening on port 3001`
- Backend API running on: **http://localhost:3001**
- API Documentation: http://localhost:3001/api

---

### Terminal 3: Start Frontend
```bash
cd apps\web
npm install              # First time only
npm run dev
```
Wait for: `▲ Next.js X.X.X`
- Frontend running on: **http://localhost:3000**
- Open browser: http://localhost:3000

---

## 🔧 Configuration

### Backend Environment (.env)
Set the AI service URL in `apps/api/.env`:
```env
AI_SERVICE_URL=http://localhost:8000
```

### AI Service Environment (.env)
```env
FRED_API_KEY=your_api_key_here  # Optional: for macro analysis
```

---

## ✨ Features & Testing

### Portfolio Management
- Create/update/delete portfolios
- Track investments with cost basis
- Monitor P&L in real-time

### AI Analysis
- **Portfolio Analysis**: Get recommendations on held positions
- **Stock Discovery**: Find top buy candidates from S&P 500
- **Strategies**: Rules-based, ML (XGBoost), or Ensemble

### How to Test AI Features
1. Sign up / Login on frontend
2. Create a portfolio with investments
3. Click "Analyze" button (coming soon in UI)
4. View AI recommendations with scores for:
   - **Fundamentals**: PE, ROE, Growth
   - **Technical**: RSI, MACD, Moving Averages
   - **Quality**: Dividends, Institutional ownership
   - **Macro**: Fed rates, VIX, Yield curve

---

## 📊 Test Coverage

### Backend
- **Total Coverage**: 73.78%
  - Auth: 84.92%
  - Portfolio: 81.08%
  - Investment: 78.84%
  - AI: 100% (18 tests)

Run tests:
```bash
cd apps\api
npm run test              # Run all tests
npm run test:cov          # Coverage report
```

### Frontend
- **Total**: 52 tests passing
  - API Layer: 11 tests
  - Components: 25 tests

Run tests:
```bash
cd apps\web
npm run test              # Watch mode
npm run test:ui           # UI mode (optional)
```

---

## 🔍 API Endpoints

### Authentication
- `POST /auth/signup` - Register
- `POST /auth/login` - Login
- `POST /auth/verify-email` - Verify email
- `POST /auth/refresh-token` - Refresh token

### Portfolio Management
- `GET /portfolio` - Get user's portfolio
- `POST /portfolio` - Create portfolio
- `PUT /portfolio/:id` - Update portfolio
- `DELETE /portfolio/:id` - Delete portfolio

### Investments
- `POST /portfolio/:portfolioId/investments` - Add investment
- `PUT /investments/:id` - Update investment
- `DELETE /investments/:id` - Delete investment
- `POST /investments/:id/transactions` - Record transaction

### AI Analysis
- `GET /ai/health` - Check AI service status
- `POST /ai/analyze/portfolio` - Analyze holdings
  ```json
  {
    "holdings": [
      {"ticker": "AAPL", "shares": 50, "avg_cost": 142.5}
    ],
    "strategy": "rules"  // "rules" | "ml" | "ensemble"
  }
  ```
- `POST /ai/analyze/discover` - Discover top candidates
  ```json
  {
    "universe": "sp500",
    "top_n": 10,
    "exclude_tickers": ["AAPL", "MSFT"],
    "strategy": "ensemble"
  }
  ```

---

## 🐛 Troubleshooting

### Frontend won't connect to backend
- Verify backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in frontend .env
- Clear browser cache: DevTools → Network → Disable cache

### AI service not responding
- Verify Python service is running on port 8000
- Check `AI_SERVICE_URL` in backend .env
- Test health endpoint: `curl http://localhost:8000/health`

### Database connection issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in backend .env
- Run migrations: `npx prisma migrate dev`

### Tests failing
- Clear node_modules: `rm -r node_modules && npm install`
- Clear jest cache: `npm run test -- --clearCache`
- Ensure no other services running on ports 3000, 3001, 8000

---

## 📱 Using the App

### 1. Sign Up
- Go to http://localhost:3000
- Enter email and password
- Verify email (check logs for verification link in dev mode)

### 2. Create Portfolio
- Click "Create Portfolio"
- Add investments (ticker, shares, cost basis)

### 3. View Analysis
- Dashboard shows portfolio summary
- Select investment to see detailed P&L
- AI analysis shows recommendation & scores

### 4. Test AI Features
- Frontend PredictionCard component displays:
  - Composite score (0-100)
  - Recommended action: BUY/HOLD/SELL/REBUY/WATCH
  - Conviction level: STRONG/MODERATE/WEAK
  - Detailed breakdown of each pillar

---

## 📦 Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| **Frontend** | Next.js | 16.1.1 |
| **Frontend** | React | 19.2 |
| **Frontend** | Tailwind CSS | 3.x |
| **Backend** | NestJS | 11.0 |
| **Backend** | Prisma | 7.2 |
| **Database** | PostgreSQL | 12+ |
| **AI** | FastAPI | 0.115 |
| **AI** | XGBoost | 2.1 |
| **Testing** | Jest (Backend) | Latest |
| **Testing** | Vitest (Frontend) | 5.0.1 |

---

## 🎯 Next Steps

1. **Add WebSocket** for real-time portfolio updates
2. **Implement watchlist** feature
3. **Add historical predictions** tracking
4. **Create notification system** for AI alerts
5. **Deploy to production** (Docker, AWS/GCP/Heroku)

---

## 📞 Support

For issues:
1. Check logs in each terminal
2. Run tests: `npm run test`
3. Clear cache & rebuild: `npm run build`
4. Check DATABASE_URL and environment variables

