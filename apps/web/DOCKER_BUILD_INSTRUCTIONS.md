# Docker Build Instructions for Arabic RTL Support

## ✅ What's Already Set Up

The Dockerfile is already configured correctly to build with the new i18n dependencies:

1. ✅ **Dependencies in package.json** - All i18n packages are listed
2. ✅ **Dockerfile copies package.json first** - Installs dependencies before copying source
3. ✅ **i18n files are included** - Translation files in `src/i18n/` will be copied
4. ✅ **Build process** - Vite will bundle translations during build

## 🚀 How to Build

### Option 1: Using Docker Compose (Recommended)

```powershell
cd apps/web

# Make sure package.json is updated (it should be)
# Then build and run:
docker-compose up --build
```

This will:
1. Copy `package.json` and `package-lock.json`
2. Run `npm ci` to install all dependencies (including i18n packages)
3. Copy all source files (including i18n translations)
4. Build the app with Vite (translations will be bundled)
5. Serve with nginx

### Option 2: Direct Docker Build

```powershell
cd apps/web

# Build the image
docker build --build-arg VITE_API_BASE_URL=http://localhost:8080 -t doormeen-web:latest .

# Or if you have a .env file:
docker build -t doormeen-web:latest .
```

### Option 3: Force Rebuild (If Cache Issues)

```powershell
cd apps/web

# Clear Docker cache and rebuild
docker-compose build --no-cache

# Then run
docker-compose up
```

## 📋 Pre-Build Checklist

Before building, ensure:

- [x] `package.json` includes i18n dependencies:
  - `react-i18next`
  - `i18next`
  - `i18next-browser-languagedetector`

- [x] Translation files exist:
  - `src/i18n/config.ts`
  - `src/i18n/locales/en.json`
  - `src/i18n/locales/ar.json`

- [x] `.dockerignore` doesn't exclude i18n files (it doesn't)

## 🔍 Verify the Build

After building, check:

1. **Container starts successfully**
   ```powershell
   docker-compose logs web
   ```

2. **Translation files are bundled**
   - Open browser dev tools
   - Check Network tab → look for translation chunks
   - Or check `dist/` folder in build stage

3. **Language switcher works**
   - Open `http://localhost:3000`
   - Click language switcher in header
   - Verify text changes and RTL layout

## 🐛 Troubleshooting

### Issue: "Module not found: react-i18next"

**Solution:** Rebuild without cache
```powershell
docker-compose build --no-cache
```

### Issue: Translations not loading

**Solution:** 
1. Check that translation files are in `src/i18n/locales/`
2. Verify `src/i18n/config.ts` imports them correctly
3. Rebuild the image

### Issue: RTL not working

**Solution:**
1. Check browser console for errors
2. Verify `src/styles/rtl.css` is imported in `index.css`
3. Check that `App.tsx` sets `document.documentElement.dir`

## 📦 Build Process Details

The Docker build process:

1. **Stage 1: Build**
   ```
   COPY package*.json → npm ci → COPY . . → npm run build
   ```
   - Installs all dependencies (including i18n)
   - Copies source code (including translations)
   - Builds with Vite (bundles translations)

2. **Stage 2: Production**
   ```
   COPY dist → nginx serves static files
   ```
   - Only built files (translations are bundled)
   - No runtime dependencies needed

## ✅ Verification Commands

```powershell
# Check if image was built
docker images | grep doormeen-web

# Check container is running
docker ps | grep DoorMeen_web

# View logs
docker-compose logs -f web

# Test the app
curl http://localhost:3000
```

## 🎯 Quick Start

```powershell
# 1. Navigate to web directory
cd apps/web

# 2. Build and run
docker-compose up --build

# 3. Open browser
# http://localhost:3000

# 4. Test language switcher
# Click the language icon in header
```

The Docker build will automatically include all i18n modifications! 🚀

