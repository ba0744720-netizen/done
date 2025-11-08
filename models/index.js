'use strict';
require('dotenv').config(); // ✅ Load .env first

const { Sequelize, DataTypes } = require('sequelize');

// ========================================
// CONNECT TO SUPABASE POSTGRESQL - FIXED VERSION
// ========================================
const sequelize = new Sequelize(
  process.env.DB_NAME || 'postgres',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '', // ✅ FIXED: Make sure this matches your .env
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log, // ✅ Changed to see connection details
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    
  }
);

// ========================================
// DEFINE MODELS
// ========================================

const Student = sequelize.define('Student', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  rollNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
  registerNumber: { type: DataTypes.STRING },
  admissionYear: { type: DataTypes.STRING },
  courseType: { type: DataTypes.STRING },
  course: { type: DataTypes.STRING },
  branch: { type: DataTypes.STRING },
  academicYear: { type: DataTypes.STRING },
  verification: { type: DataTypes.STRING },
  class: { type: DataTypes.STRING },
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'students',
});

const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  studentName: { type: DataTypes.STRING, allowNull: false },
  registerNumber: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('Present', 'Absent'), allowNull: false },
  StudentId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'attendances',
});

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  staffId: { type: DataTypes.STRING, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'teacher'), allowNull: false, defaultValue: 'teacher' },
}, {
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  tableName: 'users',
});

// ========================================
// DEFINE RELATIONSHIPS
// ========================================
Student.hasMany(Attendance, { foreignKey: 'StudentId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
Attendance.belongsTo(Student, { foreignKey: 'StudentId' });

// ========================================
// TEST CONNECTION
// ========================================
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
  }
};

testConnection();

// ========================================
// EXPORT
// ========================================
module.exports = { sequelize, Student, Attendance, User };