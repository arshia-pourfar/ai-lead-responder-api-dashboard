# 📧 AI Lead Responder Dashboard

A modern, AI-powered **email lead management and response dashboard** built with **Next.js**, **React**, and **TypeScript**.  
Designed to automatically triage incoming emails, generate intelligent replies, and guide leads through a structured pipeline — while keeping a **human approval loop** before sending messages.  
Perfect for startups, freelancers, and businesses that want faster responses without losing control over communication.

---

## 🚀 Overview

**AI Lead Responder Dashboard** is a full-stack SaaS-style project that combines **AI automation** with **manual review workflows**.  
It helps users organize incoming emails, detect intent, and prepare smart replies while maintaining security and personalization.

Users can:

- View unread emails fetched from Gmail via IMAP  
- Categorize emails automatically using AI  
- Edit or approve AI-generated replies  
- Send emails manually or automatically  
- Track sales-ready leads  
- Analyze performance through visual dashboards  

The system focuses on **speed, efficiency, and human-controlled automation**, making it ideal for real-world business communication scenarios.

---

## 🛠️ Technologies Used

- **Next.js (App Router)** – Full-stack framework  
- **React 19** – UI rendering and components  
- **TypeScript** – Type-safe development  
- **Tailwind CSS** – Responsive and utility-first styling  
- **PostgreSQL** – Relational database  
- **Prisma ORM** – Database management and migrations  
- **JWT & bcrypt** – Authentication and security  
- **Nodemailer & IMAP** – Email sending and receiving  
- **Gemini API** – AI category detection and reply generation  
- **Recharts** – Data visualization and analytics  

---

## ✨ Key Features

- 🤖 AI-powered email categorization (`sales`, `support`, `complaint`, `general`, custom categories)  
- ✍️ AI-generated reply suggestions with editable prompts  
- 👤 Human approval workflow before sending emails  
- 📥 Gmail IMAP unread email ingestion  
- 📤 SMTP email sending with fallback strategies  
- 🔐 Secure authentication with JWT & encrypted credentials  
- 📊 Analytics dashboard with charts and summaries  
- 🧭 Lead pipeline management (Unread → Ready → Sent → Sales-Ready)  
- 🔎 Search, filtering, sorting, and pagination across lists  
- 📱 Fully responsive dashboard UI  
- ⚙️ Modular and scalable code architecture  

---

## 📦 Installation & Local Setup

```bash
# Clone repository
git clone <your-repo-url>
cd ai-lead-responder-dashboard

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Run database migrations
npx prisma migrate dev
npx prisma generate

# Start development server
npm run dev
````

Then open your browser at:

```
http://localhost:3000
```

---

## 📂 Project Structure

```plaintext
ai-lead-responder/
├── app/                    # Next.js routes and pages
├── components/             # Reusable UI components
├── lib/
│   ├── services/           # AI, email, and business logic
│   ├── middleware/         # Auth guards
│   ├── utils/              # Helper functions
│   └── prisma.ts           # Prisma client
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # SQL migrations
│   └── seed.js             # Demo data
├── public/                 # Static assets
├── styles/                 # Global styling
├── .env                    # Environment variables
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

---

## 🔐 Environment Variables

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/ai_db"
JWT_SECRET="your-secret-key"

GEMINI_API_KEY="your-gemini-key"

EMAIL_USER="yourgmail@gmail.com"
EMAIL_PASS="app-password"

SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_SECURE="true"
```

---

## 📊 Use Cases

* Freelancers managing client emails
* Startups handling sales inquiries
* Customer support automation
* Lead qualification and prioritization
* Personal productivity tools

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to your branch
5. Open a Pull Request

---

## 👤 Author

**Arshia Pourfar**      
GitHub: [https://github.com/arshia-pourfar](https://github.com/arshia-pourfar)       
LinkedIn: [https://www.linkedin.com/in/arshia-pourfar](https://www.linkedin.com/in/arshia-pourfar)      
Email: [arshiapourfar@gmail.com](mailto:arshiapourfar@gmail.com)     
