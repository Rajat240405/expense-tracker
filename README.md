# Expenses Tracker

A clean, distraction-free expense tracking app built with React, TypeScript, and Supabase.

## Features

- 📊 Track expenses with categories and notes
- 💰 Multi-currency support
- 📱 Progressive Web App (PWA)
- 🤝 Split expenses with friends
- 📈 Visual charts and budget tracking
- ☁️ Optional cloud sync with Supabase
- 📱 Android app via Capacitor

## Prerequisites

- Node.js (v18 or higher)
- For Android builds: Android Studio and Java 17

## Run Locally (Web/PWA)

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Configure Supabase for cloud sync:
   - Copy `.env.example` to `.env.local`
   - Add your Supabase credentials (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md))

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Build for Production (Web)

```bash
npm run build
npm run preview
```

## Build Android APK

1. Sync Capacitor:
   ```bash
   npm run cap:sync
   ```

2. Open in Android Studio:
   ```bash
   npm run cap:open:android
   ```

3. Build APK from Android Studio or run:
   ```bash
   npm run cap:run:android
   ```

See [MOBILE_SETUP.md](MOBILE_SETUP.md) for detailed Android setup instructions.

## Project Structure

- `/components` - React components
- `/contexts` - React context providers (Auth)
- `/services` - Data sync services
- `/lib` - Supabase client configuration
- `/android` - Capacitor Android project
- `/public` - Static assets
