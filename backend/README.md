# Clinical Decision Support Tool - Backend API

This is a Node.js/Express backend for the Clinical Decision Support Tool, converted from the original Caffeine.ai (Internet Computer) implementation.

## Features

- **RESTful API** for managing patients, medical records, treatments, and outcomes
- **JWT Authentication** replacing Internet Identity
- **File-based persistence** for easy deployment
- **OpenAI Integration** for treatment analysis
- **Role-based access control** (Admin and User roles)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update the `.env` file with your configuration:
   - Set a secure `JWT_SECRET`
   - Add your `OPENAI_API_KEY` (optional, can be set via admin panel)
   - Adjust `PORT` if needed

## Development

Run the development server with hot reload:
```bash
npm run dev
```

## Production

Build and run for production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (first user becomes admin)
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/profile` - Update user profile
- `GET /api/auth/is-admin` - Check if user is admin

### Patients
- `GET /api/patients` - Get all patients
- `GET /api/patients/:patientId` - Get single patient
- `POST /api/patients` - Add new patient (admin only)
- `PUT /api/patients/:patientId` - Update patient (admin only)
- `DELETE /api/patients/:patientId` - Delete patient (admin only)
- `GET /api/patients/search/:searchTerm` - Search patients

### Patient Data
- `PUT /api/patients/:patientId/vitals` - Update vitals
- `POST /api/patients/:patientId/medical-records` - Add medical record
- `PUT /api/patients/:patientId/medical-records/:recordId` - Update medical record
- `DELETE /api/patients/:patientId/medical-records/:recordId` - Delete medical record
- `POST /api/patients/:patientId/treatments` - Add treatment
- `PUT /api/patients/:patientId/treatments/:treatmentId` - Update treatment
- `DELETE /api/patients/:patientId/treatments/:treatmentId` - Delete treatment
- `POST /api/patients/:patientId/outcomes` - Log outcome
- `PUT /api/patients/:patientId/outcomes/:outcomeId` - Update outcome
- `DELETE /api/patients/:patientId/outcomes/:outcomeId` - Delete outcome
- `PUT /api/patients/:patientId/summary` - Update summary
- `GET /api/patients/:patientId/summary` - Get summary

### Chat & AI Analysis
- `GET /api/patients/:patientId/chat` - Get chat history
- `POST /api/patients/:patientId/chat` - Add chat message
- `DELETE /api/patients/:patientId/chat` - Clear chat history
- `POST /api/patients/:patientId/analyze-treatment` - Analyze treatment with AI

### Admin
- `GET /api/admin/openai-key` - Get OpenAI API key
- `PUT /api/admin/openai-key` - Update OpenAI API key
- `GET /api/admin/settings` - Get all settings
- `GET /api/admin/audit-logs` - Get audit logs

## Data Storage

All data is stored in JSON files in the `data/` directory:
- `patients.json` - Patient records
- `users.json` - User accounts
- `settings.json` - Admin settings
- `audit-logs.json` - Audit trail

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret for JWT token signing
- `OPENAI_API_KEY` - OpenAI API key (optional)
- `DATA_DIR` - Directory for data files (default: ./data)
- `CORS_ORIGIN` - Allowed CORS origin (default: http://localhost:5173)


