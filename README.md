# Clinical Decision Support Tool

A comprehensive web-based clinical decision support system that helps healthcare professionals analyze treatment options using AI-powered insights based on patient records and medical case studies.

## 🎯 Features

- **Secure Authentication**: JWT-based authentication replacing Internet Identity
- **Patient Management**: Comprehensive CRUD operations for patient records
- **Medical Records**: Track patient history, vitals, and medical conditions
- **Treatment Planning**: Document treatments and outcomes
- **AI-Powered Analysis**: OpenAI integration for evidence-based treatment insights
- **Admin Panel**: Configure OpenAI API keys and manage system settings
- **Role-Based Access**: Admin and User roles with appropriate permissions
- **Dark Mode**: Full dark mode support with theme toggle
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## 🏗️ Architecture

This application has been converted from the original Caffeine.ai (Internet Computer) implementation to a standard web stack:

- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Node.js + Express + TypeScript
- **Storage**: File-based JSON storage (easily replaceable with a database)
- **Authentication**: JWT tokens
- **AI**: OpenAI API integration

## 📋 Prerequisites

- Node.js 20 or higher
- npm or yarn
- OpenAI API key (optional, can be configured later via admin panel)

## 🚀 Quick Start

### Option 1: Development Mode

#### Backend Setup

```bash
cd backend-new
npm install
cp .env.example .env
# Edit .env and set your JWT_SECRET
npm run dev
```

The backend will run on http://localhost:3001

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:5173

### Option 2: Docker Deployment

```bash
# Copy environment template
cp .env.example .env

# Edit .env and set your JWT_SECRET
# Build and run with Docker Compose
docker-compose up -d
```

Access the application at http://localhost:5173

## 🔧 Configuration

### Backend Configuration (.env)

```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OPENAI_API_KEY=
DATA_DIR=./data
CORS_ORIGIN=http://localhost:5173
```

### Frontend Configuration (.env)

```env
VITE_API_URL=http://localhost:3001
```

## 👥 User Management

### First User Setup

1. Navigate to the application URL
2. Click "Don't have an account? Create one"
3. Enter your details and register
4. **The first user is automatically assigned as Administrator**

### Admin Features

- Configure OpenAI API key
- Add/Edit/Delete patients
- View audit logs
- Full system access

### Regular Users

- View patients
- Update medical records
- Log treatments and outcomes
- Use AI treatment analysis

## 📁 Project Structure

```
clinical-decision-support-tool/
├── backend-new/           # Node.js/Express backend
│   ├── src/
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth & other middleware
│   │   ├── types.ts      # TypeScript types
│   │   └── server.ts     # Main server file
│   ├── data/             # JSON data storage
│   └── package.json
├── frontend/              # React frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilities & API client
│   │   └── types.ts      # TypeScript types
│   └── package.json
├── docker-compose.yml     # Docker orchestration
├── .env.example          # Environment template
└── README.md
```

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Role-based access control
- Protected API endpoints
- CORS configuration
- Helmet.js security headers
- Input validation and sanitization

## 🗄️ Data Persistence

By default, the application uses JSON file storage in the `data/` directory:

- `patients.json` - Patient records
- `users.json` - User accounts (passwords hashed)
- `settings.json` - Admin settings (OpenAI API key)
- `audit-logs.json` - System audit trail

**Note**: For production use, consider migrating to a proper database (PostgreSQL, MongoDB, etc.)

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/is-admin` - Check admin status

### Patients

- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get single patient
- `POST /api/patients` - Add new patient (admin)
- `PUT /api/patients/:id` - Update patient (admin)
- `DELETE /api/patients/:id` - Delete patient (admin)

### Patient Data

- `PUT /api/patients/:id/vitals` - Update vitals
- `POST /api/patients/:id/medical-records` - Add medical record
- `POST /api/patients/:id/treatments` - Add treatment
- `POST /api/patients/:id/outcomes` - Log outcome
- `PUT /api/patients/:id/summary` - Update summary

### AI & Chat

- `POST /api/patients/:id/analyze-treatment` - Analyze treatment with AI
- `GET /api/patients/:id/chat` - Get chat history
- `POST /api/patients/:id/chat` - Add chat message
- `DELETE /api/patients/:id/chat` - Clear chat history

### Admin

- `GET /api/admin/openai-key` - Get OpenAI API key
- `PUT /api/admin/openai-key` - Update OpenAI API key
- `GET /api/admin/settings` - Get all settings
- `GET /api/admin/audit-logs` - Get audit logs

## 🧪 Testing

```bash
# Backend tests (when implemented)
cd backend-new
npm test

# Frontend tests (when implemented)
cd frontend
npm test
```

## 📦 Production Deployment

### Using Docker

1. Set environment variables in `.env`
2. Build and deploy:

```bash
docker-compose up -d --build
```

### Manual Deployment

1. Build backend:
```bash
cd backend-new
npm run build
npm start
```

2. Build frontend:
```bash
cd frontend
npm run build
# Serve the dist/ folder with nginx or similar
```

## 🔄 Migration from Caffeine.ai

This application was originally built on Caffeine.ai (Internet Computer). The key changes made:

- **Authentication**: Internet Identity → JWT tokens
- **Backend**: Motoko (ICP) → Node.js/Express
- **Storage**: ICP canisters → JSON files (easily upgradeable to SQL/NoSQL)
- **Types**: ICP-specific types → Standard TypeScript
- **API**: Actor calls → REST API endpoints

All functionality from the original spec has been preserved and improved.

## 📝 License

MIT License - feel free to use this for your healthcare projects.

## 🙏 Acknowledgments

- Originally built with Caffeine.ai
- Converted to standard web stack for broader deployment options
- Uses OpenAI for treatment analysis
- Built with modern React and TypeScript best practices

## 🐛 Troubleshooting

### Backend won't start
- Check that port 3001 is available
- Verify `.env` file exists with JWT_SECRET
- Ensure Node.js version is 20+

### Frontend can't connect to backend
- Verify backend is running on port 3001
- Check VITE_API_URL in frontend/.env
- Check CORS settings in backend

### OpenAI integration not working
- Ensure OpenAI API key is configured in Admin Settings
- Check backend logs for API errors
- Verify API key has sufficient credits

## 📞 Support

For issues or questions, please open an issue on the repository.

---

Built with ❤️ for better patient care


