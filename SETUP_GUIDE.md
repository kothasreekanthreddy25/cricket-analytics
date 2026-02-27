# Complete Setup Guide for Cricket Analytics Application

## Step-by-Step Installation Guide

### Step 1: Prerequisites Installation

#### Install Node.js
1. Download Node.js from https://nodejs.org/ (LTS version recommended)
2. Run the installer
3. Verify installation:
   ```bash
   node --version  # Should show v18.x or higher
   npm --version   # Should show npm version
   ```

#### Install PostgreSQL
1. Download PostgreSQL from https://www.postgresql.org/download/
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Verify installation:
   ```bash
   psql --version  # Should show PostgreSQL version
   ```

#### Install VS Code (Recommended)
1. Download VS Code from https://code.visualstudio.com/
2. Install the application

### Step 2: Project Setup

#### 1. Open Project in VS Code
```bash
# Open the cricket-analytics folder in VS Code
code cricket-analytics
```

#### 2. Install Node Dependencies
Open terminal in VS Code (Ctrl + ` or Cmd + `) and run:
```bash
npm install
```

This will install all required packages including:
- Next.js
- React
- Prisma
- BetterAuth
- Tailwind CSS
- And all other dependencies

#### 3. Create PostgreSQL Database

**Option A: Using pgAdmin (GUI)**
1. Open pgAdmin
2. Connect to your PostgreSQL server
3. Right-click on "Databases" → Create → Database
4. Name it `cricket_analytics`
5. Click "Save"

**Option B: Using Command Line**
```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE cricket_analytics;

# Verify
\l

# Exit
\q
```

#### 4. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` in VS Code and configure:

```env
# Database Configuration
# Replace 'postgres' with your PostgreSQL username if different
# Replace 'your_password' with your PostgreSQL password
# Keep 'localhost:5432' if running locally
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/cricket_analytics?schema=public"

# Better Auth Configuration
# Generate a random 32+ character string for security
# You can use: openssl rand -base64 32
BETTER_AUTH_SECRET="replace-with-random-32-character-string"
BETTER_AUTH_URL="http://localhost:3000"

# Cricket API Configuration
# Get your free API key from https://www.cricapi.com/
CRICKET_API_KEY="your-api-key-here"
CRICKET_API_URL="https://api.cricapi.com/v1"
```

#### 5. Get Cricket API Key

1. Visit https://www.cricapi.com/
2. Sign up for a free account
3. Go to your dashboard
4. Copy your API key
5. Paste it in the `.env` file for `CRICKET_API_KEY`

Alternative API providers:
- https://cricketdata.org/
- https://www.cricbuzz.com/api (if available)

#### 6. Initialize Database

Run these commands in order:

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (creates tables)
npm run db:push
```

You should see output indicating tables were created.

### Step 3: Run the Application

#### Start Development Server
```bash
npm run dev
```

The application will start at http://localhost:3000

You should see:
```
✓ Ready in 2s
○ Local:        http://localhost:3000
```

#### Open in Browser
Navigate to http://localhost:3000 in your web browser.

### Step 4: Test the Application

1. **Home Page**: Should load with hero section and features
2. **Sign Up**: Click "Sign Up" to create an account
   - Enter your name, email, and password
   - Click "Sign up"
3. **Sign In**: Log in with your credentials
4. **Live Matches**: Navigate to Matches page to see live cricket matches
5. **Teams**: View cricket teams
6. **Players**: Browse player information

### Common Issues and Solutions

#### Issue: "Cannot connect to database"
**Solution:**
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database `cricket_analytics` exists
- Verify username and password are correct

#### Issue: "Module not found"
**Solution:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install
```

#### Issue: "Port 3000 already in use"
**Solution:**
```bash
# Kill process on port 3000
# On Mac/Linux:
lsof -ti:3000 | xargs kill -9

# On Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port:
npm run dev -- -p 3001
```

#### Issue: "Prisma Client not generated"
**Solution:**
```bash
npm run db:generate
```

#### Issue: "API returns no data"
**Solution:**
- Verify CRICKET_API_KEY is valid
- Check if API has rate limits
- Try accessing API directly in browser

### VS Code Extensions Setup

When you open the project in VS Code, you should see a notification to install recommended extensions. Click "Install All" or install manually:

1. **ESLint**: Code quality and formatting
2. **Prisma**: Prisma schema support
3. **Tailwind CSS IntelliSense**: Tailwind class autocomplete
4. **Prettier**: Code formatter (optional)

### Database Management

#### View Database with Prisma Studio
```bash
npm run db:studio
```
This opens a GUI at http://localhost:5555 to view and edit database records.

#### Reset Database
```bash
# Warning: This deletes all data
npx prisma db push --force-reset
```

### Development Tips

#### Hot Reload
- Changes to code automatically reload the browser
- Changes to .env require restarting the dev server

#### Debug Mode
Add console.logs in your code to debug. They appear in:
- Browser console (client components)
- Terminal (server components, API routes)

#### View API Responses
Use browser DevTools:
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Click on requests to see responses

### Production Build

To test production build:

```bash
# Build the application
npm run build

# Start production server
npm run start
```

### Next Steps

1. Customize the styling in `app/globals.css`
2. Add more features in components
3. Implement additional API endpoints
4. Add more cricket statistics
5. Deploy to Vercel or another hosting platform

### Getting Help

- Check README.md for detailed documentation
- Review component code for examples
- Check Next.js documentation: https://nextjs.org/docs
- Check Prisma documentation: https://www.prisma.io/docs
- Check BetterAuth documentation: https://www.better-auth.com/docs

### Deployment

When ready to deploy:

1. **Vercel (Easiest)**:
   - Push code to GitHub
   - Import project in Vercel
   - Add environment variables
   - Deploy

2. **Other Platforms**:
   - Railway: https://railway.app
   - Render: https://render.com
   - Netlify: https://www.netlify.com

Remember to use a production PostgreSQL database (not localhost) when deploying!

---

## Quick Reference Commands

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server

# Database
npm run db:generate     # Generate Prisma Client
npm run db:push         # Push schema to database
npm run db:studio       # Open Prisma Studio

# Other
npm run lint            # Run ESLint
```

---

Congratulations! Your Cricket Analytics application is now ready to use! 🏏🎉
