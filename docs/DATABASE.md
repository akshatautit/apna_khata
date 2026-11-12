# Khaata ka database kaise kaam karta hai

Yeh document simple Hinglish mein hai, taaki poora flow samajh aa jaaye: login kaun save hota hai, PDF upload ke baad numbers kahan jaate hain, aur Chat un numbers ko kaise padhta hai.

## Pehle yeh yaad rakho

Khaata ka data **ek hi MongoDB database** mein hai. Uska naam hai **khaata**.

Us database ke andar do lists hain. Inko **collections** bolte hain:

- **users** — kaun login kar sakta hai
- **statements** — un logon ne jo PDF upload ki, usme se nikaley gaye paise ke numbers

Website khud MongoDB se seedha baat nahi karti. Browser (React app) Express API ko call karta hai. Sirf API database padhti aur likhti hai.

```
Browser (Login, Statements, History, Chat)
        |
        |  HTTP  /api/...   +  login token
        v
Express API  (backend/src)
        |
        |  mongoose
        v
MongoDB Atlas
   database: khaata
      users
      statements
```

Atlas mein dekhne ka raasta:

**Database → Cluster0 → Browse Collections → khaata**

## 1. users — login wale accounts

Ek document = ek insaan.

| Field | Matlab |
| --- | --- |
| `_id` | Account ki id. MongoDB khud banata hai. Statement isi id ko point karta hai. |
| `name` | Screen pe dikhne wala naam. Register pe naam khali chhodo to API email ka `@` se pehle wala hissa naam bana deti hai. |
| `email` | Login email. Hamesha lowercase mein save hoti hai. Do accounts ki email same nahi ho sakti. |
| `passwordHash` | Password ka bcrypt hash. Asli password database mein kabhi save nahi hota. Isliye purana password wapas nahi nikala ja sakta. |
| `createdAt` / `updatedAt` | Account kab bana aur last time kab change hua. |

Abhi database mein yeh accounts hain:

| name | email | kab bana |
| --- | --- | --- |
| akshataofc11 | akshataofc11@gmail.com | 14 Oct 2026 |
| Akshata | akshataofc101@gmail.com | 14 Oct 2026 |
| abc | abc@gmail.com | 15 Oct 2026 |

`abc` ki `_id` hai `6ad0a308887e9c091ab9eea9`.

### Register pe kya hota hai

Page: `/register`  
API: `POST /api/auth/register`

1. API check karti hai ki email aur password aaye hain, aur password kam se kam 6 characters ka hai.
2. Woh email pehle se **users** mein hai to jawab aata hai: `email already registered`.
3. Password ko `bcrypt.hash` se hash kiya jaata hai, phir ek naya **users** document insert hota hai.
4. API ek JWT deti hai (login token) aur saath mein name aur email. Browser token ko `khata_token` naam se localStorage mein rakh leta hai. User ka name/email `khata_user` mein jaata hai.

Password ka asli text response mein nahi aata. Sirf hash database mein rehta hai.

### Login pe kya hota hai

Page: `/login`  
API: `POST /api/auth/login`

1. API us email ka **users** document dhoondhti hai.
2. Email mile hi nahi, to message aata hai: **No account with this email. Register first.**
3. Email mil gayi, lekin password hash se match nahi hua, to message aata hai: **Wrong password for this email.**
4. Password match ho gaya to naya JWT milta hai. Uske baad Statements, History, aur Chat har request pe yeh token bhejte hain.

Token ke andar user ki `_id` hoti hai (`sub` field). API isi id se decide karti hai ki kis ke statements dikhane hain. `abc@gmail.com` se login karoge to Akshata ke uploads nahi dikhenge.

Token 7 din tak valid rehta hai (`JWT_EXPIRES_IN`). Sign karne ke liye `JWT_SECRET` use hota hai.

Logout pe browser `khata_token` aur `khata_user` dono hata deta hai. Token expire ho jaaye ya galat ho, to API `401` deti hai aur app wapas Login pe bhej deti hai.

Code: `backend/src/models/User.js`, `backend/src/controllers/auth.controller.js`, `backend/src/middlewares/auth.js`, `frontend/src/context/AuthContext.jsx`, `frontend/src/api.js`.

## 2. statements — ek upload kiya hua PDF

Ek document = ek user ka ek upload.

PDF file khud database mein **save nahi** hoti. API PDF ko memory mein padhti hai, usme se paise ki lines nikalti hai, aur wahi numbers save karti hai.

| Field | Matlab |
| --- | --- |
| `_id` | Is upload ki id. |
| `user` | Jis account ne upload kiya, uski `_id`. Yahi **users** se link hai. |
| `fileName` | File ka asli naam, jaise `Invoice-3FQT9OGK-0013.pdf`. |
| `uploadedAt` | Upload ka exact time. |
| `uploadedDate` | Sirf din, `YYYY-MM-DD`. History page isi se din ke hisaab se group karti hai. |
| `totalPages` | PDF mein kitne pages the. |
| `transactionCount` | Parser ko kitni money rows mili. |
| `summary` | Poori file ke totals. Neeche detail hai. |
| `transactions` | Money rows ki list. Parser ko kuch na mile to yeh khaali array hoti hai. |
| `createdAt` / `updatedAt` | MongoDB ne document kab save kiya. |

### summary ke andar 6 fields

| Field | Matlab |
| --- | --- |
| `totalSpent` | Debit (paise gaye) ka jod. |
| `totalReceived` | Credit (paise aaye) ka jod. |
| `net` | `totalReceived - totalSpent`. |
| `ledgerScore` | 0 se 100. Paise aaye hon to yeh savings rate hai: `(received - spent) / received`. |
| `transactionCount` | Upar wale count jaisa hi. |
| `categories` | Har category ka spent, received, aur count. Jaise Food, Grocery, Transport. |

### transactions ki ek row

| Field | Matlab |
| --- | --- |
| `sno` | Row number. |
| `date` | Date `DD/MM/YYYY` mein. |
| `rawDate` | PDF mein date jaisi likhi thi. |
| `merchant` | Shop ya person ka naam, line se nikala hua. |
| `category` | Inme se ek: Food, Grocery, Transport, Bills & Utilities, Entertainment, Shopping, Health, Rent, Salary, Transfer, ATM, Other. |
| `type` | `debit` matlab paise gaye. `credit` matlab paise aaye. |
| `amount` | Amount. |
| `balance` | Running balance, jab PDF mein ho. PhonePe rows mein aksar balance nahi hota. |

### Jo row Atlas mein dikhi thi

```
_id              6ad0a325887e9c091ab9eeaa
user             6ad0a308887e9c091ab9eea9     ← abc@gmail.com
fileName         Invoice-3FQT9OGK-0013.pdf
uploadedAt       2026-10-15 09:55 UTC
uploadedDate     2026-10-15
totalPages       1
transactionCount 0
summary          spent 0, received 0, net 0, score 50
transactions     []
```

`user` field `abc` ki id se match karti hai. Isliye yeh file sirf us account ke login pe dikhti hai.

`transactionCount` 0 isliye hai kyunki yeh file ek **invoice** hai. Yeh bank statement nahi hai aur PhonePe statement bhi nahi. Parser sirf woh do layouts samajhta hai. File phir bhi save ho gayi, khaali list ke saath, aur default score 50 ke saath.

Code: `backend/src/models/Statement.js`, `backend/src/services/historyStore.js`.

## 3. Upload ka order

Page: **Statements**  
API: `POST /api/statements/upload`  
File field ka naam: `statement`  
Sirf PDF, max 10 MB. Login zaroori hai.

```
PDF file
  → pdf-parse text nikalta hai          (backend/src/services/pdfParser.js)
  → parser text ko padhta hai           (backend/src/services/statementParser.js)
       bank layout:  "1  15.10.2026  UPI/ZOMATO ...  250.00  10000.00"
       PhonePe layout: "Oct 15, 2026" phir "DEBIT ₹250 Zomato"
  → keyword rules category lagate hain (Zomato → Food, Uber → Transport)
  → jo merchants ab bhi Other hain, unhe Gemini ke paas bheja jaata hai
       Gemini down ho to upload phir bhi save hoti hai, keyword categories ke saath
  → buildSummary() spent, received, net, score, categories banata hai
  → statements mein ek naya document insert hota hai
       user = jo abhi login hai uski _id
```

History aur Chat PDF ko dobara nahi padhte. Woh isi saved document ko padhte hain.

## 4. Har page database ko kaise use karta hai

| Page | API | Kya hota hai |
| --- | --- | --- |
| Statements (upload ke baad) | `POST /api/statements/upload` | Ek **statements** document likhta hai, phir wahi result screen pe dikhata hai. |
| History | `GET /api/statements/history` | Login user ki saari statements, nayi pehle. `uploadedDate` se din-wise group. |
| Chat | `POST /api/chat/message` | Sirf us user ki **sabse nayi** statement. Purani uploads Chat nahi dekhta. |

### Chat do tarike se jawab deta hai

**Seedha numbers se**, jab sawal ek jaani-pehchaani line ho:

- category ka naam: `Food`, `Grocery`, `Transport`, wagairah
- `total spent`, `kharcha`
- `received`, `income`
- `net`, `balance`, `bachat`
- `ledger score`
- `how many` / `transactions`
- `overview`

Inme se **sirf Overview** pe Spent, Received, Net, Score, aur Txns ki strip dikhti hai. Baaki fixed sawalon pe sirf ek seedha jawab aata hai, jaise "You spent ₹500.00 in total." Poori strip har sawal pe nahi aati.

Category ke chips bhi sirf un categories ke dikhte hain jinme is statement ki transactions hain. Entertainment ki koi row nahi hai to Entertainment chip dikhega hi nahi.

**Gemini se**, jab sawal upar wali list mein na ho. Code: `backend/src/services/aiAnalyst.js`. Gemini ko file ka naam, summary, aur max 120 transactions milte hain. Jawab plain sentences mein aata hai, bina us four-number strip ke. Upload ke time bhi Gemini use hota hai, un shop names ke liye jo keyword list se category nahi bani.

Gemini band ho ya key missing ho, to Chat yeh fixed line dikhata hai: "I didn't quite get that..."

Match poore word pe hota hai. "which" ke andar "hi" chhupa hai, isliye "which" ko Hello nahi maana jaata. "spending" ko automatically "total spent" wala short jawab nahi maana jaata.

## 5. Dono collections ka link

**users._id** ko **statements.user** mein rakha jaata hai.

```
users                         statements
abc                           Invoice-3FQT9OGK-0013.pdf
6ad0a308887e9c091ab9eea9  ←→  user: 6ad0a308887e9c091ab9eea9
```

Baaki do accounts ka koi statement document nahi hai, isliye unka History page khaali dikhega.

## 6. Test karte waqt kahan dekho

Atlas (raw documents):

1. cloud.mongodb.com → Project 0 → Database → Cluster0 → Browse Collections.
2. Database **khaata**.
3. **users** accounts ke liye. **statements** uploads ke liye.

App (jo insaan screen pe dekhta hai):

1. `backend` folder mein `npm run dev` (port 5000).
2. `frontend` folder mein `npm run dev` (aksar http://localhost:5173/).
3. Jis account ki file hai, usi se login karo. Purana password pata na ho to **Register** se naya account banao.
4. **History** upload dikhati hai. **Chat** sabse nayi file pe sawal ka jawab deta hai.

Is computer ka IP Atlas ke Network Access mein hona chahiye, warna database connect nahi hoga. Pehle sirf `171.50.244.191` allowed tha. Baad mein `152.58.44.169` add hua tha. IP badle to Atlas mein naya IP dubara add karna padega.

## 7. Project kahan tak bana hai, aur aage kya baaki hai

### Ho chuka hai

1. Atlas se `khaata` database connect ho chuka hai.
2. Register, login, JWT, aur per-user statements kaam karte hain.
3. Bank PDF aur PhonePe PDF dono ka parser hai. Keyword category hai, aur bache hue merchants ke liye Gemini hai.
4. History din ke hisaab se dikhti hai.
5. Chat fixed sawal seedhe numbers se jawab deta hai. Normal sawal Gemini se jaata hai.
6. Category chips sirf un categories ke hain jinme transactions hain.
7. Login ka error ab clearly batata hai: account nahi hai, ya password galat hai.

### Abhi baaki hai

1. **Asli statement upload karke database mein dekhna.**  
   Login karo, PhonePe PDF ya bank statement PDF upload karo (date, amount, balance wali). Atlas mein nayi **statements** row kholo. `transactionCount` 0 se bada hona chahiye, aur `transactions` khaali `[]` nahi honi chahiye.  
   Jo invoice pehle se padi hai (`Invoice-3FQT9OGK-0013.pdf`) usme 0 transactions hain, isliye woh is test ke liye kaafi nahi hai.

2. **Teen screens us nayi file se match karo.**  
   Statements page totals dikhaye. History aaj ki date ke neeche file dikhaye. Chat "total spent" ya "Food" pe usi nayi file se jawab de.

3. **Invoice wali row rehne do.**  
   Woh example hai: file save ho gayi, parse kuch nahi hua, score 50, transactions 0. Nayi real statement aate hi Chat usi ko use karega, kyunki Chat hamesha latest upload leta hai.
