# Supabase Authentication Setup Guide

## Overview

This project now includes authentication with Supabase, supporting:

- Email/Password Sign In and Sign Up
- Google OAuth authentication
- Session management

## Setup Instructions

### Step 1: Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in with your GitHub account
3. Click "New Project" and fill in the details:
   - **Project Name**: Your project name (e.g., "RepurpMed")
   - **Database Password**: Create a strong password
   - **Region**: Choose the region closest to your users
4. Click "Create new project" and wait for it to initialize

### Step 2: Get Your API Credentials

1. Once your project is created, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### Step 3: Configure Your Application

1. Open [supabase-config.js](./supabase-config.js)
2. Replace the placeholder values with your actual Supabase credentials:
   ```javascript
   const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
   const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
   ```

### Step 4: Enable Authentication Providers

#### Email Authentication (Enabled by Default)

- Email/Password authentication is automatically enabled

#### Google OAuth

1. In your Supabase dashboard, go to **Authentication** → **Providers**
2. Click on **Google**
3. Set it to "Enabled"
4. You'll need to set up OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable Google+ API
   - Create OAuth 2.0 credentials:
     - Click "Create Credentials" → "OAuth 2.0 Client ID"
     - Choose "Web application"
     - Add authorized redirect URIs:
       - `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
       - `http://localhost:3000` (for local testing)
   - Copy the Client ID and Client Secret
5. Paste them into your Supabase Google provider settings

### Step 5: Set Up Email Confirmation (Optional)

If you want email verification for new accounts:

1. Go to **Authentication** → **Email Templates**
2. Configure the confirmation email template (already set up by default)
3. When users sign up, they'll receive a confirmation email

### Step 6: Create Database Tables (Optional)

For storing additional user information, create tables in your Supabase dashboard:

```sql
-- User Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to view their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);
```

## Features Implemented

### Authentication Modal

- **Sign In**: Email/password login or Google OAuth
- **Sign Up**: Create account with name, email, and password, or use Google OAuth
- **Form Validation**: Basic validation for required fields and password length
- **Responsive Design**: Works on all device sizes

### Authentication Flows

1. **Email/Password Sign In**
   - Users enter email and password
   - Session is maintained in browser

2. **Email/Password Sign Up**
   - Users provide name, email, and password
   - Confirmation email is sent (if enabled)
   - Can redirect to email confirmation page

3. **Google OAuth**
   - Single-click sign in/up with Google
   - Automatically creates account on first sign in
   - User profile information is saved

### Session Management

- User session is checked on page load
- Sign In button shows user email when authenticated
- Sign In button changes color when authenticated
- Auth state changes are listened to in real-time

## File Structure

```
├── index.html              # Main page with auth modal
├── index.css               # Styles including auth modal
├── auth.js                 # Authentication logic
├── supabase-config.js      # Supabase configuration
└── SUPABASE_SETUP.md       # This file
```

## Testing

1. Open your website in a browser
2. Click "Sign In" button in the navigation
3. Try creating an account with email/password
4. Try signing in with Google
5. Check the browser console for any errors

## Troubleshooting

### "Supabase is not defined" error

- Make sure `supabase-config.js` is loaded before `auth.js`
- Check that the Supabase SDK script from CDN is loading correctly

### Google OAuth not working

- Verify your Google OAuth credentials are correct in Supabase
- Check that your redirect URI matches the one in Google Console
- For local testing, make sure you added `http://localhost:3000` to authorized redirect URIs

### Email confirmation not working

- Check your email spam/junk folder
- Verify email templates are configured in Supabase
- Make sure you enabled email confirmations

## Next Steps

1. **Connect to Database**: Create tables to store user data beyond authentication
2. **Protected Routes**: Add checks to prevent unauthorized access to certain pages
3. **User Profile Page**: Create a dashboard for authenticated users
4. **Logout**: Add a logout button in your navigation
5. **Password Reset**: Implement forgot password functionality

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [YouTube Supabase Tutorial](https://www.youtube.com/watch?v=c5C2d8rn6hY)

## Security Notes

- Never commit your actual API keys to version control
- Use environment variables in production
- Implement Row Level Security (RLS) for your database tables
- Always validate data on the server side
- Use HTTPS in production

---

Need help? Visit [Supabase Support](https://supabase.com/support)
