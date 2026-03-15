# Bluelight Academy - School Management System

A comprehensive school management system built with modern web technologies.

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT Authentication
- bcryptjs for password hashing

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- React Hook Form
- Axios for API calls
- React Hot Toast for notifications

## Features

- User Authentication (Admin, Teacher, Student roles)
- Student Management
- Teacher Management
- Class Management
- Responsive Design

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account or local MongoDB installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your MongoDB connection string:
```
MONGODB_URI=your_mongodb_connection_string
PORT=5000
JWT_SECRET=your_jwt_secret
```

4. Start the development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user

### Students
- GET `/api/students` - Get all students
- GET `/api/students/:id` - Get student by ID
- POST `/api/students` - Create new student
- PUT `/api/students/:id` - Update student
- DELETE `/api/students/:id` - Delete student

### Teachers
- GET `/api/teachers` - Get all teachers
- GET `/api/teachers/:id` - Get teacher by ID
- POST `/api/teachers` - Create new teacher
- PUT `/api/teachers/:id` - Update teacher
- DELETE `/api/teachers/:id` - Delete teacher

### Classes
- GET `/api/classes` - Get all classes
- GET `/api/classes/:id` - Get class by ID
- POST `/api/classes` - Create new class
- PUT `/api/classes/:id` - Update class
- DELETE `/api/classes/:id` - Delete class

## Default Login

To create an admin user, use the register endpoint with role: "admin"

## License

This project is licensed under the MIT License.