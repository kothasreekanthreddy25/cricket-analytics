# Cricket Analytics Application

A comprehensive cricket analytics platform built with Next.js, Prisma, PostgreSQL, and BetterAuth.

## Features

- 🏏 **Live Cricket Scores**: Real-time updates for ongoing matches
- 📊 **Team Analytics**: Detailed team statistics and performance metrics
- 👤 **Player Statistics**: Comprehensive player performance data
- 🔐 **Authentication**: Secure user authentication with BetterAuth
- 📱 **Responsive Design**: Works seamlessly on all devices
- ⚡ **Real-time Updates**: Auto-refresh functionality for live matches

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: BetterAuth
- **UI Components**: Lucide Icons, Recharts
- **API**: Cricket API integration

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18.x or later
- PostgreSQL 14.x or later
- npm or yarn package manager

## Installation & Setup

### 1. Clone or Extract the Project

```bash
cd cricket-analytics
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```sql
CREATE DATABASE cricket_analytics;
```

### 4. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and configure your environment variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/cricket_analytics?schema=public"

# Better Auth
BETTER_AUTH_SECRET="your-secret-key-minimum-32-characters-long"
BETTER_AUTH_URL="http://localhost:3000"

# Cricket API (Get your API key from cricapi.com)
CRICKET_API_KEY="your-cricket-api-key"
CRICKET_API_URL="https://api.cricapi.com/v1"
```

**Important Notes:**
- Replace `username` and `password` with your PostgreSQL credentials
- Generate a secure random string for `BETTER_AUTH_SECRET` (minimum 32 characters)
- Get a free API key from [cricapi.com](https://www.cricapi.com/) or another cricket API provider

### 5. Set Up the Database

Run Prisma migrations to create the database schema:

```bash
npm run db:generate
npm run db:push
```

### 6. Run the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## VS Code Setup

### Recommended Extensions

Install these VS Code extensions for the best development experience:

1. **ESLint** (`dbaeumer.vscode-eslint`)
2. **Prisma** (`Prisma.prisma`)
3. **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
4. **TypeScript and JavaScript Language Features** (built-in)

### VS Code Settings

Create `.vscode/settings.json` in your project root:

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## Project Structure

```
cricket-analytics/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   └── matches/        # Match data endpoints
│   ├── auth/               # Authentication pages
│   ├── matches/            # Match pages
│   ├── teams/              # Team pages
│   ├── players/            # Player pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── Navbar.tsx          # Navigation component
│   └── LiveMatches.tsx     # Live matches display
├── lib/                     # Utility functions
│   ├── auth.ts             # BetterAuth configuration
│   ├── auth-client.ts      # Auth client utilities
│   ├── cricket-api.ts      # Cricket API integration
│   ├── prisma.ts           # Prisma client
│   └── utils.ts            # Helper functions
├── prisma/                  # Database schema
│   └── schema.prisma       # Prisma schema
├── .env.example            # Environment variables template
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── package.json            # Project dependencies
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Features Overview

### Authentication
- Email/password authentication via BetterAuth
- Session management
- Protected routes
- User registration and login

### Live Matches
- Real-time score updates
- Match status indicators (Live, Upcoming, Finished)
- Auto-refresh every 60 seconds
- Detailed match information

### Team Analytics
- Team rankings
- Performance statistics
- Historical data
- Win/loss records

### Player Statistics
- Player profiles
- Career statistics
- Performance metrics
- Role-based filtering

## API Integration

The application uses the Cricket API for fetching live match data. You can configure different API providers by modifying `lib/cricket-api.ts`.

### Supported API Endpoints
- Current Matches
- Match Information
- Match Scorecard
- Player Information
- Series Information

## Database Schema

The application uses the following main database models:

- **User**: User accounts and authentication
- **Session**: User sessions
- **Match**: Cricket match data
- **Team**: Team information and statistics
- **Player**: Player profiles and statistics
- **Favorite**: User's favorite matches

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Railway
- Render
- AWS
- Google Cloud
- Azure

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists

### API Issues
- Verify CRICKET_API_KEY is valid
- Check API rate limits
- Review API endpoint URLs

### Build Errors
- Delete `node_modules` and `.next` folders
- Run `npm install` again
- Clear Next.js cache: `rm -rf .next`

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - feel free to use this project for learning or commercial purposes.

## Support

For issues or questions:
- Check the troubleshooting section
- Review API documentation
- Open an issue on GitHub

## Acknowledgments

- Cricket API provided by [cricapi.com](https://www.cricapi.com/)
- Built with Next.js, Prisma, and BetterAuth
- UI components inspired by modern design patterns
