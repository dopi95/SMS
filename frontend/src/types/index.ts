export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'teacher' | 'student'
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Student {
  _id: string
  studentId: string
  user: User
  class?: Class
  dateOfBirth?: string
  address?: string
  phone?: string
  parentName?: string
  parentPhone?: string
  enrollmentDate: string
  createdAt: string
  updatedAt: string
}

export interface Teacher {
  _id: string
  teacherId: string
  user: User
  subject: string
  qualification?: string
  experience?: number
  phone?: string
  address?: string
  salary?: number
  joinDate: string
  createdAt: string
  updatedAt: string
}

export interface Class {
  _id: string
  name: string
  grade: string
  section: string
  teacher?: Teacher
  students: Student[]
  capacity: number
  room?: string
  createdAt: string
  updatedAt: string
}