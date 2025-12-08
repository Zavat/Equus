# Google Maps Setup for Route Screen

The Route screen now uses Google Maps to display appointment locations. To enable maps on mobile devices, you need to configure Google Maps API keys.

## For iOS

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps SDK for iOS**
4. Create credentials (API Key) for iOS
5. Restrict the API key to iOS apps with your bundle ID: `com.farrierapp.app`
6. Open `app.json` and replace `YOUR_IOS_GOOGLE_MAPS_API_KEY` with your actual API key

## For Android

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Maps SDK for Android**
4. Create credentials (API Key) for Android
5. Restrict the API key to Android apps with your package name: `com.farrierapp.app`
6. Open `app.json` and replace `YOUR_ANDROID_GOOGLE_MAPS_API_KEY` with your actual API key

## Important Notes

- The map is **only available on mobile devices** (iOS/Android), not on web
- On web, a placeholder message is shown instead
- Maps will not work without valid API keys on mobile devices
- Make sure to enable billing in Google Cloud Console (Maps API requires it)
- Consider adding usage quotas to avoid unexpected charges

## Features Implemented

- **Dual-view layout**: List of stops on the left, map on the right
- **Interactive markers**: Tap list items to highlight markers, tap markers to select stops
- **Next stop indicator**: First stop is highlighted in green
- **Dynamic updates**: Completing a stop removes it from the list and updates the map
- **Navigation button**: "Apri percorso in Maps" opens Google Maps with directions to the next stop
- **Auto-centering**: Map automatically fits to show all remaining stops

## Testing Without API Keys

For development on web, the map placeholder will be shown. To test the full functionality, you must:
1. Set up API keys as described above
2. Build and run the app on a physical device or iOS/Android emulator
3. Use `expo run:ios` or `expo run:android` (requires development build)
