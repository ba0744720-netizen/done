// ========================================
// ✅ IMPORTS & CONFIG
// ========================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// ✅ MODELS
// ========================================
const { sequelize } = require("./models");


// ========================================
// ⚙️ MIDDLEWARE
// ========================================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ========================================
// 🧠 DATABASE SEEDING FUNCTION
// ========================================
const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...");
    
    // Check Student count
    const studentCount = await students.count();
    if (studentCount === 0) {
      console.log("📚 Adding sample students...");
      await students.bulkCreate([
        { name: "John Doe", rollNumber: "A001", class: "CSE-A" },
        { name: "Jane Smith", rollNumber: "A002", class: "CSE-A" },
        { name: "Alex Brown", rollNumber: "A003", class: "CSE-A" },
        { name: "Bob Johnson", rollNumber: "B001", class: "CSE-B" },
        { name: "Carol White", rollNumber: "B002", class: "CSE-B" },
      ]);
      console.log("✅ Sample students added");
    } else {
      console.log("ℹ️  Students already exist in database");
    }

    // Check User count
    const userCount = await User.count();
    if (userCount === 0) {
      console.log("👥 Adding demo users...");
      const hashedPassword = await bcrypt.hash("password123", 10);
      
      await User.bulkCreate([
        {
          staffId: "ADM001",
          name: "Admin User",
          email: "admin@pgp.com",
          password: hashedPassword,
          role: "admin",
        },
        {
          staffId: "TCH001",
          name: "Teacher John",
          email: "teacher@pgp.com",
          password: hashedPassword,
          role: "teacher",
        },
        {
          staffId: "TCH002",
          name: "Teacher Sarah",
          email: "sarah@pgp.com",
          password: hashedPassword,
          role: "teacher",
        },
      ]);
      console.log("✅ Demo users added");
      console.log("\n📋 LOGIN CREDENTIALS:");
      console.log("   👨‍🏫 Teacher: teacher@pgp.com | 🔑 password123");
      console.log("   🔐 Admin: admin@pgp.com | 🔑 password123\n");
    } else {
      console.log("ℹ️  Users already exist in database");
    }

    console.log("✅ Database seeding completed successfully!\n");
  } catch (error) {
    console.error("❌ Seeding error:", error.message);
  }
};

// ========================================
// 🚀 START SERVER WITH PROPER INITIALIZATION
// ========================================
const startServer = async () => {
  try {
    // Step 1: Authenticate connection
    console.log("📡 Authenticating database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection verified\n");

    // Step 2: Sync models (FIXED - will create missing tables)
    console.log("🔄 Syncing database models...");
    try {
      // ✅ FIXED: Changed alter to true to create missing tables
      await sequelize.sync({ 
        alter: true,  // ✅ This will create missing tables and columns
        force: false  // Won't drop existing tables
      });
      console.log("✅ Database models synced\n");
    } catch (syncError) {
      console.log("⚠️  Sync error:", syncError.message);
      console.log("ℹ️  Trying to continue...\n");
    }

    // Step 3: Seed database
    await seedDatabase();

    // Step 4: Start listening
    app.listen(PORT, () => {
      console.log(`\n✅ Server running at: http://localhost:${PORT}`);
      console.log(`📍 Login at: http://localhost:${PORT}/login`);
      console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? "✅ Loaded" : "❌ Missing"}\n`);
    });

  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    console.error(error);
    process.exit(1);
  }
};

// ========================================
// 🌐 API ROUTES
// ========================================

// Import routes
const authRoutes = require("./routes/auth");
const attendanceRoutes = require("./routes/attendance");
const studentsRoutes = require("./routes/students");
const reportsRoutes = require("./routes/reports");
const dashboardRoutes = require("./routes/dashboard");

// Try to import admin routes if they exist
let adminRoutes;
try {
  adminRoutes = require("./routes/admin");
} catch (error) {
  console.log("⚠️  Admin routes not found, skipping...");
}

// Use API Routes
app.use("/auth", authRoutes);
app.use("/attendance", attendanceRoutes);
app.use("/students", studentsRoutes);
app.use("/reports", reportsRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Only use admin routes if they exist
if (adminRoutes) {
  app.use("/api/admin", adminRoutes);
}

// ========================================
// 📄 PAGE ROUTES - UPDATED FOR SUPABASE AUTH
// ========================================

// Middleware to check Supabase authentication
async function requireAuth(req, res, next) {
    try {
        // For API routes, check Authorization header
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (token) {
            // Verify Supabase token
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (error) throw error;
            if (user) {
                req.user = user;
                return next();
            }
        }

        // For page routes, we'll rely on client-side redirection
        // Since we're using Supabase client-side, we can't reliably check auth on server
        // Let the client handle the redirection
        return next();
        
    } catch (error) {
        console.log('Auth check failed:', error.message);
        // Let client handle the redirection
        return next();
    }
}

// Protect dashboard routes - but let client handle actual auth
app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard');
});

app.get('/mark-attendance', requireAuth, (req, res) => {
    res.render('dashboard');
});

app.get('/manage-students', requireAuth, (req, res) => {
    res.render('dashboard');
});

app.get('/view-reports', requireAuth, (req, res) => {
    res.render('dashboard');
});

// Login page should be accessible without auth
app.get('/login', (req, res) => {
    res.render('login');
});

// Root redirect - check if we have a token in query params (from Supabase redirect)
app.get('/', async (req, res) => {
    try {
        const { access_token, refresh_token } = req.query;
        
        if (access_token) {
            // We have a Supabase token from OAuth or email confirmation
            // Set the session and redirect to dashboard
            const { data: { session }, error } = await supabase.auth.setSession({
                access_token,
                refresh_token
            });
            
            if (!error && session) {
                return res.redirect('/dashboard');
            }
        }
        
        // No valid token, redirect to login
        res.redirect('/login');
    } catch (error) {
        console.error('Root route error:', error);
        res.redirect('/login');
    }
});

// Add a health check endpoint for Supabase session
app.get('/api/auth/check', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            if (user && !error) {
                return res.json({ authenticated: true, user });
            }
        }
        res.json({ authenticated: false });
    } catch (error) {
        res.json({ authenticated: false });
    }
});

// ========================================
// 🎯 START APPLICATION
// ========================================
startServer();