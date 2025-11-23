# Google Maps API Setup

## Your API Key
```
AIzaSyA8rilxCLGmuCiWwlJ5sn3TISrRdpXuYcM
```

## Setup Instructions

### 1. Add to Environment File

Open or create `.env.local` in the root of your project and add:

```bash
# Google Maps JavaScript API
NEXT_PUBLIC_MAPS_API_KEY=AIzaSyA8rilxCLGmuCiWwlJ5sn3TISrRdpXuYcM
```

### 2. Verify API is Enabled

Make sure the following APIs are enabled in your Google Cloud Console:
- **Maps JavaScript API** (required for map display)
- **Places API** (required for autocomplete and location search)
- **Geocoding API** (recommended for address lookups)

Visit: https://console.cloud.google.com/apis/library

### 3. Restart Development Server

After adding the environment variable:
```bash
# Stop the current dev server (Ctrl+C)
# Then restart it
npm run dev
```

### 4. Test Maps Functionality

The maps should now work in:
- **Apartment Location Maps** (`/components/ApartmentLocationMap.tsx`)
- **Search with Filters** (`/components/MapWithFilters.tsx`)
- **Owner Apartment Upload** (`/Owner listing/admin/Map.tsx`)

## Current Implementation

Your app uses the `@react-google-maps/api` library with the following features:

### Components Using Maps:
1. `components/ApartmentLocationMap.tsx` - Shows apartment location on detail pages
2. `components/MapWithFilters.tsx` - Interactive map with property filters
3. `Owner listing/admin/Map.tsx` - Location picker for apartment uploads

### Libraries Loaded:
- **places** - For autocomplete and search
- **marker** - For map markers

### Configuration:
The maps configuration is managed in `lib/maps/config.ts` which:
- Validates the API key format
- Provides helpful error messages
- Supports optional Map ID for custom styling

## Optional: Custom Map Styling

To add custom map styling, you can also set:
```bash
NEXT_PUBLIC_GOOGLE_MAP_ID=your-map-id-here
```

Get a Map ID from: https://console.cloud.google.com/google/maps-apis/studio/maps

## Troubleshooting

### If maps still don't load:

1. **Check Browser Console** for specific error messages
2. **Verify API Restrictions** in Google Cloud Console aren't blocking your domain
3. **Check Billing** is enabled on your Google Cloud project
4. **Verify .env.local** is in the root directory and not gitignored from being read

### Common Issues:

- **"Google Maps API error: ApiNotActivatedMapError"**
  → Enable Maps JavaScript API in console

- **"Google Maps API error: RefererNotAllowedMapError"**
  → Add `http://localhost:3000` to allowed referrers in API key restrictions

- **Maps show but Places autocomplete doesn't work**
  → Enable Places API in console
