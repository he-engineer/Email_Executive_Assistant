# Executive Assistant Mobile App

A React Native mobile app that serves as your personal executive assistant for email and calendar management.

## Features

- 🔐 **Google OAuth Authentication** - Multi-account support with Gmail and Calendar access
- 📊 **Daily Briefs** - Scheduled or on-demand briefs with prioritized emails and calendar events
- ✏️ **Smart Email Drafts** - AI-powered email reply generation with tone customization
- ⚙️ **Settings Management** - Customizable schedules, notifications, and preferences
- 📱 **Push Notifications** - Scheduled brief notifications with quiet hours support
- 📝 **Activity Logging** - Complete audit trail of all actions and interactions

## Architecture

Built following the specification from `Email Assistant.md`, this MVP implements:

### Core Components
- **Authentication Flow**: Google OAuth with multi-account support
- **Brief Generation**: Email and calendar data aggregation with AI ranking
- **Email Management**: Draft generation, editing, and sending capabilities
- **Settings System**: Comprehensive user preferences and configurations
- **Notification System**: Scheduled and instant notifications
- **Activity Tracking**: Full audit log of user actions

### Tech Stack
- **Frontend**: React Native with TypeScript
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **Authentication**: Google Sign-In
- **Storage**: AsyncStorage for local data persistence
- **APIs**: Gmail API and Calendar API integration
- **Notifications**: React Native Push Notifications

## Project Structure

```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth)
├── navigation/         # Navigation configuration
├── screens/           # Screen components
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx
│   ├── BriefScreen.tsx
│   ├── EmailDetailScreen.tsx
│   ├── SettingsScreen.tsx
│   └── ActivityScreen.tsx
├── services/          # Business logic and API services
│   ├── AuthService.ts
│   ├── GmailService.ts
│   ├── CalendarService.ts
│   ├── BriefService.ts
│   ├── LLMService.ts
│   ├── SettingsService.ts
│   ├── NotificationService.ts
│   └── ActivityLogService.ts
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)
- Google Cloud Console project with Gmail and Calendar APIs enabled

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **iOS Setup:**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Google OAuth Configuration:**
   - Create a Google Cloud Console project
   - Enable Gmail API and Calendar API
   - Create OAuth 2.0 credentials for mobile app
   - Update `src/contexts/AuthContext.tsx` with your web client ID
   - Add iOS client ID to info.plist (iOS)
   - Add Android configuration to google-services.json (Android)

4. **Run the app:**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   ```

## Configuration

### Required Environment Variables
- `GOOGLE_WEB_CLIENT_ID`: OAuth web client ID
- `OPENAI_API_KEY`: OpenAI API key for draft generation (optional, uses mock responses otherwise)

### Google API Setup
1. Enable Gmail API and Calendar API in Google Cloud Console
2. Configure OAuth consent screen
3. Add authorized domains and redirect URIs
4. Download configuration files:
   - `GoogleService-Info.plist` for iOS
   - `google-services.json` for Android

## User Flow

### Onboarding
1. User signs in with Google
2. Grants Gmail and Calendar permissions
3. Selects primary account (if multiple)
4. Default settings are applied

### Daily Usage
1. Receives scheduled brief notifications (7 AM / 7 PM by default)
2. Views prioritized emails and calendar events
3. Generates and reviews email drafts
4. Sends approved emails with confirmation
5. Manages settings and account preferences

### Key User Stories Implemented

- **US-A1**: Multi-account Google OAuth with primary account selection
- **US-A2**: Sensible default settings for immediate usability
- **US-B1/B2**: Scheduled and on-demand brief generation
- **US-C1**: Concise brief view with top 3 prioritized emails
- **US-D1/D2**: Draft generation with full user approval control
- **US-D3**: Complete activity logging and audit trail

## Development Notes

### Mock Services
The app includes mock implementations for:
- **LLMService**: Provides realistic email drafts without requiring OpenAI API
- **Email Sending**: Logs send actions without actually sending emails
- **Real-time Data**: Uses mock data for development and testing

### Production Considerations
For production deployment:
1. Implement real OpenAI API integration
2. Add proper email sending via Gmail API
3. Implement background job processing
4. Add comprehensive error handling and retry logic
5. Implement proper data encryption
6. Add analytics and crash reporting
7. Implement proper testing suite

### Security
- All sensitive data stored in device secure storage
- OAuth tokens managed by Google Sign-In library
- No email content permanently stored on device
- Activity logs can be cleared by user

## API Integration

### Gmail API
- Read inbox emails with time-based filtering
- Thread-based email organization
- Compose and send email functionality
- Label and metadata extraction

### Calendar API
- Fetch events within time windows
- Conflict detection between overlapping events
- Support for multiple calendar sources

### OpenAI API (Optional)
- Email draft generation with context awareness
- Tone customization (professional, casual, formal)
- Smart reply suggestions based on email content

## Contributing

This is an MVP implementation following the product specification. Future enhancements could include:
- Advanced email filtering and classification
- Calendar event creation and modification
- Integration with additional email providers
- Advanced AI features for scheduling optimization
- Team collaboration features

## License

Private - Executive Assistant MVP Implementation