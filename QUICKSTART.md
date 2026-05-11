# Quick Start Guide

## Prerequisites

- Node.js 20+ installed
- npm or yarn package manager
- A code editor (VS Code recommended)

## 🚀 Getting Started (5 minutes)

### Step 1: Extract and Navigate

If you haven't already:
```bash
cd C:\Users\jmleg\OneDrive\Desktop\clinical-decision-support-tool
```

### Step 2: Automated Setup (Windows)

Simply double-click `start-dev.bat` or run:
```cmd
start-dev.bat
```

This will:
- Create .env files from templates
- Install all dependencies
- Start both backend and frontend
- Open everything in separate terminal windows

### Step 2: Manual Setup (Any OS)

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit `backend/.env` and set a secure JWT_SECRET:
```env
JWT_SECRET=your-very-long-random-secret-key-here-min-32-chars
```

Start the backend:
```bash
npm run dev
```

#### Frontend Setup (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```

### Step 3: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Step 4: Create Your First Account

1. Click "Don't have an account? Create one"
2. Enter your details:
   - Full Name: Your name (e.g., "Dr. Jane Smith")
   - Username: Any username
   - Password: A secure password
3. Click "Create Account"

**🎉 The first user is automatically an Administrator!**

### Step 5: Configure OpenAI (Optional)

1. Click on your profile in the top right
2. Select "Admin Settings"
3. Enter your OpenAI API key
4. Click "Save Settings"

You can now use the AI-powered treatment analysis feature!

## 📱 What's Available

### As an Admin, you can:
- ✅ Add, edit, and delete patients
- ✅ Configure OpenAI API key
- ✅ View all system features
- ✅ Access audit logs

### Main Features:
- 👥 **Patient Management**: Add and manage patient records
- 📋 **Medical Records**: Track patient history and conditions
- 💊 **Treatments**: Document treatments and outcomes
- 🤖 **AI Analysis**: Get evidence-based treatment insights (requires OpenAI key)
- 💬 **Chat Interface**: Interactive treatment analysis
- 📊 **Vitals Tracking**: Monitor patient vital signs
- 🌙 **Dark Mode**: Toggle between light and dark themes

## 🔧 Troubleshooting

### Port Already in Use

**Backend (Port 3001):**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

**Frontend (Port 5173):**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5173 | xargs kill -9
```

### Dependencies Won't Install

Try clearing the npm cache:
```bash
npm cache clean --force
```

Then reinstall:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### Backend Connection Error

1. Ensure backend is running on port 3001
2. Check `frontend/.env` has the correct API URL:
   ```env
   VITE_API_URL=http://localhost:3001
   ```
3. Restart both frontend and backend

## 🐳 Using Docker (Alternative)

If you prefer Docker:

```bash
docker-compose up -d
```

Access at http://localhost:5173

Stop with:
```bash
docker-compose down
```

## 📚 Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Explore the API endpoints in `backend/README.md`
- Add your first patient and try the AI analysis
- Customize the application to your needs

## 🆘 Need Help?

- Check the logs in the terminal windows
- Backend logs show API requests and errors
- Frontend logs appear in browser console (F12)

---

Happy coding! 🏥✨


