# Architecture Documentation

## Project Structure

```
cars/
├── index.html              # Main HTML file
├── src/
│   ├── app.js             # Main application logic
│   ├── i18n.js            # Localization (i18n) module
│   ├── logger.js          # Logging utility
│   ├── utils.test.js      # Utility functions and tests
├── .github/
│   └── workflows/
│       └── ci.yml         # CI/CD pipeline
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite build config
├── firebase.json          # Firebase hosting config
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── .eslintrc.json         # ESLint config
├── .prettierrc.json       # Prettier config
├── .gitignore             # Git ignore rules
├── README.md              # Project overview
└── DEPLOYMENT.md          # Deployment instructions
```

## Technology Stack

### Frontend
- **HTML5 / CSS3 / JavaScript (ES6+)**: Core UI and logic
- **Chart.js**: Data visualization (monthly revenue/expense charts)
- **Vite**: Fast build tool and dev server

### Backend & Database
- **Firebase Authentication**: User login/registration
- **Cloud Firestore**: NoSQL database for cars, entries, users, and settings
- **Cloud Hosting**: Firebase Hosting for deployment

### Development Tools
- **ESLint**: Code quality and style checks
- **Prettier**: Code formatting
- **GitHub Actions**: CI/CD pipeline

### Localization & Monitoring
- **i18n module**: Arabic/English support with RTL
- **Logger module**: Application logging (extensible for remote services)

## Key Features

### 1. Car Management
- Add, edit, delete cars
- Track daily rental rates
- View entry count per car

### 2. Financial Tracking
- Income/Expense entries
- Filter entries by car, date range
- Monthly trend visualization
- Backup/restore functionality

### 3. User Management
- Role-based access (admin, manager, user)
- Firestore user collection for demo
- Impersonation feature for testing

### 4. Settings & Localization
- Currency selector
- Auto-backup interval configuration
- Dark/Light theme toggle
- Language selection (English/Arabic)

### 5. Reporting
- Generate custom reports
- Export to CSV/Excel
- Date range and car filtering

## Security Architecture

### Firestore Rules
- **Authentication Required**: Most operations require Firebase Auth
- **Role-Based Access**: Admin/Manager can write; users can read
- **Document Isolation**: Users collection restricted to admins
- **Meta Documents**: Settings and daily rent tracking (admin only)

### Best Practices Implemented
- ✅ No plaintext passwords stored in Firestore
- ✅ Firebase Auth for user management
- ✅ HTML escaping to prevent XSS
- ✅ Firestore rules for authorization
- ✅ Environment isolation (dev/prod separate projects)

## Data Model

### Collections

#### `cars`
```json
{
  "id": "uuid",
  "name": "Toyota Corolla 2019",
  "plate": "ABC-123",
  "dailyRent": 150.00
}
```

#### `entries`
```json
{
  "id": "uuid",
  "carId": "car-uuid",
  "date": "2025-12-10",
  "type": "income|expense",
  "amount": 150.00,
  "category": "Daily Rent",
  "note": "Optional note"
}
```

#### `users`
```json
{
  "id": "uuid",
  "name": "Administrator",
  "email": "admin@demo",
  "role": "admin|manager|user"
}
```

#### `meta/settings`
```json
{
  "currency": "MRU",
  "autoBackupIntervalMinutes": 60,
  "theme": "light|dark"
}
```

#### `meta/daily_rent`
```json
{
  "lastDate": "2025-12-10"
}
```

## Development Workflow

### Local Development
```bash
npm install
npm run dev
```

### Code Quality
```bash
npm run lint          # Check code
npm run lint:fix      # Auto-fix issues
npm run format        # Format code
```

### Build & Deploy
```bash
npm run build         # Build to dist/
firebase deploy       # Deploy to Firebase
```

## Performance Optimizations

1. **Real-time Listeners**: Efficient Firestore snapshot listeners
2. **Caching**: In-memory caches (carsCache, entriesCache, usersCache)
3. **Lazy Rendering**: Tables only re-render when data changes
4. **Event Delegation**: Shared event listeners on table bodies
5. **Code Splitting**: Modular imports (i18n, logger, utils)

## Future Improvements

1. **Backend API**: Migration to Cloud Functions for complex operations
2. **Advanced Testing**: Unit tests with Vitest, E2E with Playwright
3. **State Management**: Redux/Vuex for complex state handling
4. **PWA**: Service workers for offline support
5. **Analytics**: Integration with Firebase Analytics or Mixpanel
6. **Error Tracking**: Sentry integration for production monitoring
7. **API Gateway**: REST API for mobile client support
8. **Database Migrations**: Automated schema versioning

## Deployment Checklist

- [ ] Update Firebase project ID in `.firebaserc`
- [ ] Apply Firestore rules from `firestore.rules`
- [ ] Set up authentication providers in Firebase Console
- [ ] Configure custom domain (optional)
- [ ] Set up CORS headers if API is separate
- [ ] Enable Analytics and monitoring
- [ ] Create staging and production environments
- [ ] Document API endpoints and deployment steps
