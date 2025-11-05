// ========================================
// ✅ IMPORTS & CONFIG
// ========================================
require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// ✅ SUPABASE CONFIGURATION
// ========================================
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);

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
// 📄 PAGE ROUTES - UPDATED FOR SUPABASE AUTH
// ========================================

// Email confirmation endpoint
app.get('/auth/confirm', async (req, res) => {
  const { token_hash, type } = req.query;

  if (!token_hash || !type) {
    return res.render('error', { 
      message: 'Invalid confirmation link' 
    });
  }

  try {
    // Verify the OTP token with Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'signup', // Explicitly set type to signup
    });

    if (error) {
      console.error('Confirmation error:', error);
      return res.render('error', { 
        message: 'Failed to confirm email. Please try again.' 
      });
    }

    // Success - render confirmation page
    res.render('auth-confirm', { 
      message: '🎉 Email confirmed successfully!\n\nYou can now login to your account.',
      success: true 
    });

  } catch (error) {
    console.error('Server error:', error);
    res.render('error', { 
      message: 'Something went wrong. Please try again.' 
    });
  }
});

// Simple middleware to check if user is authenticated
const requireAuth = async (req, res, next) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return res.redirect('/login');
    }
    
    req.session = session;
    next();
  } catch (error) {
    res.redirect('/login');
  }
};

// Dashboard route
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard');
});

app.get('/mark-attendance', requireAuth, (req, res) => {
  res.render('mark-attendance');
});

app.get('/manage-students', requireAuth, (req, res) => {
  res.render('manage-students');
});

app.get('/view-reports', requireAuth, (req, res) => {
  res.render('view-reports');
});

app.get('/admin-dashboard', requireAuth, (req, res) => {
  res.render('admin-dashboard');
});

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Root redirect
app.get('/', async (req, res) => {
  try {
    const { access_token, refresh_token, token_hash, type } = req.query;

    // Handle email confirmation redirect
    if (token_hash && type === 'signup') {
      return res.redirect(`/auth/confirm?token_hash=${token_hash}&type=${type}`);
    }

    // Handle session tokens
    if (access_token) {
      const { data: { session }, error } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (!error && session) {
        return res.redirect('/dashboard');
      }
    }

    // Check existing session
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      return res.redirect('/dashboard');
    }

    res.redirect('/login');
  } catch (error) {
    console.error('Root route error:', error);
    res.redirect('/login');
  }
});

// Health check endpoint
app.get('/api/auth/check', async (req, res) => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return res.json({ authenticated: false });
    }

    res.json({ 
      authenticated: true, 
      user: session.user 
    });
  } catch (error) {
    res.json({ authenticated: false });
  }
});

// API route to manually create teacher record (backup solution)
app.post('/api/create-teacher', async (req, res) => {
  try {
    const { staff_id, name, email, user_id } = req.body;
    
    const { data, error } = await supabase
      .from('teachers')
      .insert([
        {
          staff_id,
          name,
          email,
          user_id,
          created_at: new Date()
        }
      ])
      .select();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Manual teacher creation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========================================
// 🚀 START SERVER
// ========================================
app.listen(PORT, () => {
  console.log(`\n✅ Server running at: http://localhost:${PORT}`);
  console.log(`📍 Login at: http://localhost:${PORT}/login`);
  console.log(`🔐 Supabase URL: ${process.env.SUPABASE_URL ? "✅ Loaded" : "❌ Missing"}`);
});