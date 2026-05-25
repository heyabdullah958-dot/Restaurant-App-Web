# 🚀 Backend Complete Cheatsheet
### Transcript + OWASP 2025 Standards — Ek Jagah Sab Kuch

---

## 1. BIG PICTURE — Frontend, Backend, Database

```
USER (Browser)
    ↓ Request
FRONTEND (Next.js) → Jo user dekhta hai
    ↓ API Call
BACKEND (Node.js + Express) → Brain of the app
    ↓ Query
DATABASE (MongoDB Atlas) → Permanent storage
    ↑ Data
BACKEND → Response bana ke bhejta hai
    ↑ JSON Response
FRONTEND → User ko dikhata hai
```

**Restaurant Analogy:**
- Menu/Table = Frontend
- Waiter = API
- Kitchen = Backend
- Fridge/Pantry = Database

### 🕵️‍♂️ API Discovery & Browser Inspection
* **Inspect (Network Tab):** Kisi bhi website pe `Right Click → Inspect → Network` tab mein jao. Jab bhi aap click karte ho ya form submit karte ho, wahan frontend se backend ki API call dikhti hai. Payload aur headers check karne ke liye best hai.
* **Wappalyzer:** Yeh browser extension website kis tech stack (Next.js, React, Node, database, Firebase, etc.) par bani hai, use detect karne ke liye use hota hai.

---

## 2. CUSTOM vs MANAGED BACKEND

| Cheez | Supabase/Firebase | Custom (Node.js) |
|-------|-------------------|------------------|
| Setup | Fast | Thoda time lagta hai |
| Control | Limited | Full control |
| Security | Basic RLS | Production-grade |
| Scaling | Expensive | Cost control |
| AI Integration | Limited | Full flexibility |

**Kab Custom Backend Banao:**
- Complex business logic ho
- Multi-tenant app ho
- Full security control chahiye
- AI/ML integration ho
- Cron jobs chahiye hon
- Kloud billing control chahiye

---

## 3. SERVER KYA HAI — Localhost vs Live

```
LOCALHOST (Development)
URL: http://localhost:5000
Sirf tumhara computer access kar sakta hai
Kisi ko share karo → nahi khulay ga

LIVE SERVER (Production)
URL: https://api.yourdomain.com
Poori duniya access kar sakti hai
24/7 on rehta hai
```

**Ports Concept:**
```
Tumhara computer = Building
Port = Apartment Number

localhost:5000  → Apartment 5000 = Tumhara Node.js
localhost:3000  → Apartment 3000 = Tumhara Frontend
localhost:27017 → Apartment 27017 = MongoDB
Port 80         → HTTP websites
Port 443        → HTTPS secure websites
```

---

## 4. NODE.JS + EXPRESS

```
Node.js  = Engine (JavaScript ko browser ke bahar chalata hai)
Express  = Steering Wheel (routes organize karta hai)

Node.js bina: Code complex aur repetitive
Express ke saath: Clean, organized, readable
```

### 📘 JavaScript vs TypeScript (TS)
* **TypeScript (TS):** "TS means TypeScript — type safety reduces errors." JavaScript dynamic hai, isliye bugs late catch hote hain. TypeScript static types enforce karke coding level par hi errors pakad leta hai taake application production-ready ho.

---

## 5. HTTP METHODS (CRUD)

| Method | CRUD | Kab Use Karo | Example |
|--------|------|--------------|---------|
| GET    | Read | Data lana, kuch change nahi | GET /users |
| POST   | Create | Naya data banana | POST /users |
| PUT    | Update | Poora record replace karo | PUT /users/42 |
| PATCH  | Update | Sirf specific fields update karo | PATCH /users/42 |
| DELETE | Delete | Record delete karo | DELETE /users/42 |

**⚠️ CRITICAL SECURITY RULE:**
```
Password KABHI URL mein mat daalo:
❌ WRONG: GET /login?password=12345
✅ CORRECT: POST /login → Body mein password daalo
```

---

## 6. API ENDPOINTS — Structure

```
https://api.yourapp.com/users/42?format=json

https://         → Protocol
api.yourapp.com  → Base URL (tumhara server)
/users           → Route (kahan jaana hai)
/42              → Path Parameter (specific ID)
?format=json     → Query Parameter (filter/search)
```

**Real Examples:**
```
GET    /api/users          → Sab users lao
GET    /api/users/42       → User ID 42 ki detail
POST   /api/users          → Naya user banao
PUT    /api/users/42       → User 42 pura update karo
PATCH  /api/users/42       → User 42 ka email hi badlo
DELETE /api/users/42       → User 42 delete karo
```

---

## 7. HTTP STATUS CODES

| Code | Matlab | Kab Aata Hai |
|------|--------|--------------|
| 200  | OK | GET/PUT/PATCH success |
| 201  | Created | POST success (kuch bana) |
| 400  | Bad Request | Galat data bheja |
| 401  | Unauthorized | Token nahi / invalid |
| 403  | Forbidden | Login hai but permission nahi |
| 404  | Not Found | URL exist nahi karta |
| 409  | Conflict | Email already exists |
| 500  | Server Error | Backend crash hua |

---

## 8. WEBHOOKS

```
Normal API:  TUM server se poochhtey ho (pull)
Webhook:     Server TUM ko batata hai (push)

Example: Razorpay payment aaya?

❌ Normal API:  Har 5 minute mein check karo → Slow, wasteful
✅ Webhook:     Razorpay automatic tumhara URL call karta hai → Fast, efficient
```

---

## 9. DATABASE — SQL vs NoSQL

| SQL (PostgreSQL) | NoSQL (MongoDB) |
|-----------------|-----------------|
| Tables, Rows, Columns | Documents (JSON format) |
| Strict schema | Flexible schema |
| Relations excellent | Documents excellent |
| Finance, E-commerce | User profiles, Real-time |

**MongoDB Document Example:**
```json
{
  "_id": "64abc123",
  "fullName": "Abdullah Nadeem",
  "email": "abdullah@example.com",
  "role": "admin",
  "createdAt": "2026-05-22"
}
```

---

## 10. ENVIRONMENT VARIABLES (.env)

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/DBName
JWT_ACCESS_SECRET=64_char_secret_here
JWT_REFRESH_SECRET=64_char_refresh_secret_here
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CORS_ORIGIN=http://localhost:3000
GEMINI_API_KEY=your_key_here
```

**⚠️ RULES:**
```
✅ .env file → .gitignore mein daalo
✅ .env.example → GitHub pe push karo (values blank rakho)
❌ KABHI .env GitHub pe push mat karo
❌ KABHI secrets code mein hardcode mat karo
```

**JWT Secret Generator:** jwsecrets.com

---

## 11. SECURITY — Auth vs Authorization

```
Authentication = "TUM KAUN HO?"
→ Login karna, account banana
→ JWT token generate hota hai

Authorization = "TUM KYA KAR SAKTE HO?"
→ Role check karna (buyer, agent, admin)
→ Admin sab dekhe, buyer sirf apna data
```

**Hotel Analogy:**
```
Authentication → Reception pe check-in, key card milti hai
Authorization  → Key card sirf tumhara room kholti hai
```

---

## 12. JWT TOKENS

```
Access Token  → 15 min expire → Authorization header mein
Refresh Token → 7 days expire → HTTP-only cookie mein

Flow:
1. Login → Access Token + Refresh Token milta hai
2. Access Token expire → /api/auth/refresh call karo
3. New Access Token milta hai (bina dobara login kiye)
4. Logout → Cookie clear ho jaati hai
```

---

## 13. HTTP-ONLY COOKIES

```
Normal Cookie:   JavaScript read kar sakta hai → Hackable (XSS)
HTTP-only Cookie: JavaScript nahi read kar sakta → Secure ✅

Refresh Token → HTTP-only Cookie mein store karo
Access Token  → Frontend memory (React State) mein store karo
               NEVER localStorage ya sessionStorage mein
```

---

## 14. CORS POLICY

```
Problem: Browser by default different domain se requests block karta hai

Frontend: app.yourdomain.com
Backend:  api.yourdomain.com
→ Browser block karta hai!

Solution: Backend mein CORS allow karo sirf frontend URL ke liye

app.use(cors({
  origin: process.env.CORS_ORIGIN,  // sirf teri site
  credentials: true
}));
```

---

## 15. IP WHITELISTING

```
MongoDB Atlas Level:
→ Sirf tumhara Kloudbean server ka IP allowed
→ Koi aur IP se database accessible nahi

Steps:
1. Kloudbean → Tumhara Server → IP Address copy karo
2. MongoDB Atlas → Network Access → Add IP Address
3. Kloudbean ka IP paste karo → Confirm

Result: 
✅ Tumhara backend connect kar sakta hai
❌ Koi random internet user direct database access nahi kar sakta
```

---

## 16. RATE LIMITING

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests max
  message: { success: false, message: 'Too many requests.' }
});

// Iska faida:
// Koi 1000 baar login try kare → Automatic block
// Brute force attacks se protection
```

---

## 17. GLOBAL ERROR HANDLER

```javascript
// Express Error Handling Middleware Example
// Yeh HAMESHA server.js mein sabse last mein rakho
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});
```

---

## 18. INPUT VALIDATION

```javascript
// express-validator se XSS + injection se bachao
const { body, validationResult } = require('express-validator');

exports.registerRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('fullName').trim().notEmpty()
];

// Route mein use karo:
router.post('/register', registerRules, validate, register);
```

---

## 19. CRON JOBS

```javascript
// Automatic scheduled tasks
// Example: 30 din purana data delete karo

const cron = require('node-cron');

// Har din raat 12 baje chalega
cron.schedule('0 0 * * *', async () => {
  await TrashItem.deleteMany({
    deletedAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
  });
  console.log('Old trash cleaned up');
});
```

---

## 20. COMPLETE SERVER.JS MIDDLEWARE ORDER

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const xss = require('xss-clean');
const hpp = require('hpp');

const app = express();

connectDB();                    // 1. Database connect
app.use(helmet());              // 2. Security headers
app.use(cors({...}));           // 3. CORS policy
app.use(morgan('dev'));         // 4. Request logging
app.use(limiter);               // 5. Rate limiting
app.use(express.json());        // 6. JSON body parser
app.use(cookieParser());        // 7. Cookie parser
app.use(xss());                 // 8. XSS protection
app.use(hpp());                 // 9. HTTP param pollution
app.use('/api', routes);        // 10. Routes
app.get('/health', ...);        // 11. Health check
app.use(404Handler);            // 12. 404 handler
app.use(errorHandler);          // 13. Global error handler
```

---

## 21. HEALTH CHECK ENDPOINT

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'OK', timestamp: new Date() }
  });
});

// Test karo: GET http://localhost:5000/health
// Live test: GET https://your-kloudbean-url.com/health
// Response: { "success": true, "data": { "status": "OK" } }
```

---

## 22. API DOCUMENTATION (API.md)

```markdown
# Project API Documentation

## Base URL
Development: http://localhost:5000/api
Production:  https://your-domain.com/api

## Auth Endpoints
POST /auth/register  → Naya account
POST /auth/login     → Login
POST /auth/refresh   → Naya access token
POST /auth/logout    → Logout
GET  /auth/profile   → Profile dekho
PUT  /auth/profile   → Profile update

## Response Format
Success: { "success": true, "data": {...} }
Error:   { "success": false, "message": "..." }
```

---

## 23. MCP SERVER SETUP (Cursor/Anti-Gravity)

```json
// Cursor Settings → Tools & MCP → Add Server
{
  "mcpServers": {
    "mongodb-projectname": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-mongodb"],
      "env": {
        "MONGODB_URI": "your_mongodb_connection_string_here"
      }
    }
  }
}
```

**Faida:**
```
AI directly tumhara database read/write kar sakta hai
Testing mein automatically verify karta hai
"Check karo users create hue ya nahi" → AI check karta hai
```

---

## 24. POSTMAN TESTING GUIDE

```
1. Desktop App install karo (localhost ke liye zaroori)
2. Workspace banao (project name se)
3. Collection banao category-wise:
   → Auth (register, login, logout, refresh)
   → Properties / Main Feature
   → Admin
   → Health

4. Base URL set karo:
   Development: http://localhost:5000
   Production:  https://your-kloudbean-url.com

5. Auth kaise karo:
   → Login karo → Access Token copy karo
   → Doosri requests mein Headers mein daalo:
     Key:   Authorization
     Value: Bearer <access_token_here>

6. Variables use karo:
   → Collection mein base_url variable save karo
   → Har request mein {{base_url}}/endpoint use karo
```

---

## 25. COMMANDS — COMPLETE LIST

### Installation Commands
```bash
# Node.js check karo
node -v
npm -v

# Project initialize karo
npm init -y

# Production packages install karo
npm install express mongoose jsonwebtoken bcryptjs dotenv cors express-rate-limit helmet morgan cookie-parser express-validator xss-clean hpp

# Development packages
npm install --save-dev nodemon

# Single package install
npm install package-name

# Package uninstall
npm uninstall package-name
```

### Server Commands
```bash
# Development server start karo
npm run dev

# Production server start karo
npm start

# Server kill karo (terminal mein)
Ctrl + C

# Port check karo (koi aur service use kar rahi hai)
lsof -i :5000
```

### Git Commands
```bash
# Git initialize karo (sirf ek baar)
git init

# Files ka status dekho
git status

# Sab files track karo
git add .

# Specific file track karo
git add filename.js

# Commit karo (message zaroori)
git commit -m "feat: add auth system"

# GitHub remote add karo (sirf ek baar)
git remote add origin https://github.com/username/repo.git

# GitHub pe push karo
git push origin main

# Pull karo (latest code lao)
git pull origin main

# Branch dekho
git branch

# .gitignore check karo
cat .gitignore
```

### MongoDB Commands (Compass)
```
# Connection string format:
mongodb+srv://username:password@cluster.mongodb.net/DatabaseName

# Database switch karo → Compass left side pe click
# Collection refresh → Refresh button
# Document add karo → Add Data → Insert Document
# Document edit karo → Edit (pencil icon)
```

### Postman Curl Import
```bash
# Terminal se API test karo
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test User","email":"test@example.com","password":"123456"}'

# Postman mein import karo:
# Import → Paste curl command → Import
```

---

## 26. BUILD & PRODUCTION OUTPUT (dist/ vs .next/)
* **Vite/React/Plain JS:** Build hone ke baad saara optimized code `/dist` folder mein compile hota hai.
* **Next.js:** Next.js build ke baad output code `/.next` folder mein save karta hai.
* **Explanation:** Production server par pura source code (`/src`) deploy nahi kiya jata, balki sirf optimized build folder (`/dist` ya `/.next`) aur absolute minimum dependencies (`node_modules`) upload hoti hain taake server fast aur secure chale.

---

## 27. DEPLOYMENT STEPS — KLOUDBEAN

### 💰 Kloudbean Multiple Projects Advantage
* **Render / Railway / Heroku:** Ek server/instance = Ek single project. Har naye project ke liye alag se bill pay karna parta hai.
* **Kloudbean:** Ek VPS server/iNode base buy kar lo, aur us single server ke resources ko allocate karke **multiple separate applications/projects** chalaye ja sakte hain. Yeh massive cost-saving advantage deta hai.

```
STEP 1: GitHub pe push karo
git add .
git commit -m "ready for deployment"
git push origin main

STEP 2: Kloudbean pe jaao
→ Add Server (iNode cheapest ≈ ₹700-800/month)
→ Add Application → Node.js → Name daalo

STEP 3: GitHub connect karo
→ Code Delivery → Connect GitHub
→ Repository select karo
→ Branch: main
→ Path: /backend (agar backend folder hai)

STEP 4: Environment Variables
→ Environment Variables → Paste Content
→ Apna .env file ka content paste karo
→ PORT → Kloudbean assigned port use karo (e.g. 435)
→ Save Variables

STEP 5: MongoDB IP Whitelist
→ Kloudbean → Server → IP Address copy karo
→ MongoDB Atlas → Network Access → Add IP Address
→ Kloudbean IP paste karo → Confirm

STEP 6: Deploy karo
→ Pull and Deploy click karo
→ Reload History se progress dekho
→ Complete aane ka wait karo

STEP 7: Verify karo
→ https://your-subdomain.kloudbean.com/health
→ Response: { "success": true, "data": { "status": "OK" } }
→ ✅ Server live hai!
```

---

## 28. CURSOR RULES FILE

```
Location: .cursor/rules/api-update.mdc

Content Example:
Jab bhi koi route ya controller change ho:
1. API.md mein update karo
2. Status codes verify karo
3. Error handling check karo
4. Postman collection update karo

Yeh rule automatically har commit pe run hoga
```

---

## 29. RESPONSE FORMAT — HAMESHA CONSISTENT

```javascript
// ✅ Success (GET)
res.status(200).json({ success: true, data: {...} });

// ✅ Created (POST)
res.status(201).json({ success: true, message: 'Created', data: {...} });

// ✅ Error
res.status(400).json({ success: false, message: 'Validation failed' });

// ✅ Unauthorized
res.status(401).json({ success: false, message: 'Invalid token' });

// ✅ Forbidden
res.status(403).json({ success: false, message: 'Not authorized' });

// ✅ Not Found
res.status(404).json({ success: false, message: 'Not found' });

// ✅ Server Error
res.status(500).json({ success: false, message: 'Internal server error' });
```

---

## 30. COMMON MISTAKES — KABHI MAT KARO

```
❌ .env GitHub pe push karna
❌ Password plaintext save karna
❌ JWT secret hardcode karna
❌ node_modules push karna
❌ localStorage mein tokens save karna
❌ MongoDB URI public karna
❌ Rate limiting skip karna
❌ Input validation bhoolna
❌ Error messages mein sensitive info dikhana
❌ Admin role bina verification ke dena
❌ MongoDB Atlas mein 0.0.0.0/0 (sab IPs allow) karna
❌ Port number .env mein na daalna
```

---

## 31. QUICK REFERENCE CARD

```
New Project Start:
npm init -y → npm install [packages] → .env banao → server.js → npm run dev

Auth Flow:
Register/Login → JWT generate → Cookie set → Frontend ko token do

Request Flow:
Frontend → API Call → Middleware (auth check) → Controller → Database → Response

Deployment Flow:
git push → Kloudbean connect → .env set → IP whitelist → Deploy → /health check

Debugging:
Error 401 → Token check karo
Error 403 → Role check karo
Error 500 → Terminal logs dekho
MongoDB nahi connect → URI check karo + IP whitelist check karo
```

---

*Complete Cheatsheet — Transcript + OWASP 2025 Standards*
*Last Updated: May 2026*
