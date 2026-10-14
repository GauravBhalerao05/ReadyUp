const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User, Category, Topic, Company, Question } = require('../src/models');
const { generateToken } = require('../src/services/authService');

const setupTestDB = () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });
};

const createTestUsers = async () => {
  const student = await User.create({
    name: 'Test Student',
    email: `student_${Date.now()}@readyup.edu`,
    password: 'Password123!',
    role: 'student',
    department: 'CSE'
  });

  const coordinator = await User.create({
    name: 'Test Coordinator',
    email: `coord_${Date.now()}@readyup.edu`,
    password: 'Password123!',
    role: 'coordinator',
    department: 'T&P'
  });

  const admin = await User.create({
    name: 'Test Admin',
    email: `admin_${Date.now()}@readyup.edu`,
    password: 'Password123!',
    role: 'admin',
    department: 'Admin'
  });

  return {
    student,
    studentToken: generateToken(student),
    coordinator,
    coordinatorToken: generateToken(coordinator),
    admin,
    adminToken: generateToken(admin)
  };
};

module.exports = {
  setupTestDB,
  createTestUsers
};
