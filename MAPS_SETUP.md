# Maps Setup for Route Screen

The Route screen now uses **Expo Maps** to display appointment locations with a professional dual-view layout.

## Configuration

The app is configured to use `expo-maps`, which works out of the box on iOS and Android. For production builds with Google Maps, you'll need API keys:

### For iOS (Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps SDK for iOS**
4. Create credentials (API Key) for iOS
5. Restrict the API key to iOS apps with your bundle ID: `com.farrierapp.app`
6. Open `app.json` and replace `YOUR_IOS_GOOGLE_MAPS_API_KEY` with your actual API key

### For Android (Production)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps SDK for Android**
4. Create credentials (API Key) for Android
5. Restrict the API key to Android apps with your package name: `com.farrierapp.app`
6. Open `app.json` and replace `YOUR_ANDROID_GOOGLE_MAPS_API_KEY` with your actual API key

## Important Notes

- Maps work on **iOS and Android** (both Expo Go and production builds)
- On **web**, a placeholder message is shown (maps are mobile-only)
- For development with Expo Go, default maps will work without API keys
- For production builds, Google Maps API keys are required
- Make sure to enable billing in Google Cloud Console
- Consider adding usage quotas to avoid unexpected charges

## Features Implemented

### Dual-View Layout
- **Left panel**: Scrollable list of today's stops
- **Right panel**: Interactive map with markers

### List Features
- Each stop shows: client name, address, horses count, time
- First stop highlighted in green (next stop)
- Selected stop highlighted in blue
- Tap any stop to highlight its marker on the map
- Phone call button (if customer has phone)
- Complete button to mark stop as done

### Map Features
- Color-coded markers:
  - **Green**: Next stop (first in list)
  - **Blue**: Selected stop
  - **Red**: Other stops
- Tap marker to select and show stop info
- Auto-centers when stops are completed
- Zoom and pan controls
- Shows user location

### Dynamic Updates
- Completing a stop removes it from the list
- Map automatically recenters to remaining stops
- Route updates in real-time

### Navigation
- **"Apri percorso in Maps"** button at bottom
- Opens Google Maps with turn-by-turn directions to next stop
- Uses device's current location as starting point

## Testing

### On Expo Go (Development)
- Install Expo Go app on your iOS/Android device
- Scan QR code from `npm run dev`
- Maps will work without additional configuration

### On Production Build
- Run `eas build --platform ios` or `eas build --platform android`
- Requires Google Maps API keys configured in `app.json`
- Test on physical device or emulator

### On Web
- Maps are disabled on web (shows placeholder)
- List functionality works normally
- "Apri percorso in Maps" button still functions
