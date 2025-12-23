# Deployment Guide

## Prerequisites
- Node.js 16+ installed
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project created at https://firebase.google.com

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Login to Firebase
```bash
firebase login
```

### 4. Initialize Firebase in Project (if not done)
```bash
firebase init hosting
firebase init firestore
```

### 5. Deploy to Firebase Hosting
```bash
firebase deploy
```

## Development
```bash
npm run dev
```

## Linting & Formatting
```bash
npm run lint
npm run lint:fix
npm run format
```

## Configuration
- Update `src/app.js` with your Firebase config (if different)
- Update `firestore.rules` with your security rules
- Update `firebase.json` for custom hosting settings

## Environment
- Project ID: `cars-9b2bd`
- Database: Firestore
- Auth: Firebase Authentication

## Security Notes
- Never commit Firebase credentials to version control
- Use `.gitignore` to exclude `.env` files
- Apply Firestore rules from `firestore.rules` in Firebase Console
