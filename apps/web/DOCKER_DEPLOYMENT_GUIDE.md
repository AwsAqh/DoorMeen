# Docker Deployment Guide for DoorMeen Frontend

## 📋 Prerequisites

- Docker Desktop installed and running
- `.env` file with `VITE_API_BASE_URL` configured
- Backend API running and accessible

## 🚀 Quick Start - Running Locally with Docker

### Step 1: Create `.env` file (if not exists)

Create `apps/web/.env` file:
```env
VITE_API_BASE_URL=http://localhost:8080
```

**For production, use your actual API URL:**
```env
VITE_API_BASE_URL=https://your-api-domain.com
```

### Step 2: Navigate to the Web Directory
```powershell
cd apps\web
```

### Step 3: Build and Run with Docker Compose
```powershell
docker-compose up --build
```

This will:
- Build the React app with Vite
- Create a production-optimized build
- Serve it with nginx on port 3000
- Load environment variables from `.env`

### Step 4: Access the Application
Open your browser:
```
http://localhost:3000
```

### Step 5: Stop the Container
Press `Ctrl+C` in the terminal, or run:
```powershell
docker-compose down
```

## 🐳 Docker Commands Reference

### Build Only (without running)
```powershell
docker-compose build
```

### Run in Detached Mode (background)
```powershell
docker-compose up -d
```

### View Logs
```powershell
docker-compose logs -f
```

### Stop and Remove Containers
```powershell
docker-compose down
```

### Rebuild After Changes
```powershell
docker-compose up --build --force-recreate
```

## 📦 Creating a Docker Image for Deployment

### Build the Image
```powershell
docker build -t doormeen-web:latest --build-arg VITE_API_BASE_URL=https://your-api-url.com .
```

### Tag for Registry (e.g., Docker Hub)
```powershell
docker tag doormeen-web:latest yourusername/doormeen-web:latest
```

### Push to Docker Hub
```powershell
docker login
docker push yourusername/doormeen-web:latest
```

## ☁️ Deployment Options

### Option 1: Azure Static Web Apps (Recommended for Frontend)
1. Connect your GitHub repository
2. Azure will automatically build and deploy
3. Configure `VITE_API_BASE_URL` in App Settings
4. Free tier available with great performance

### Option 2: Azure Container Instances (ACI)
1. Push image to Azure Container Registry (ACR)
2. Create container instance
3. Configure environment variables
4. Set up public IP and port mapping

### Option 3: Azure App Service (Container)
1. Push image to ACR or Docker Hub
2. Create App Service with container deployment
3. Configure `VITE_API_BASE_URL` in App Settings
4. Enable HTTPS

### Option 4: AWS Amplify
1. Connect GitHub repository
2. Configure build settings
3. Set environment variables
4. Automatic deployments on push

### Option 5: Netlify / Vercel
1. Connect GitHub repository
2. Configure build command: `npm run build`
3. Set environment variables
4. Automatic deployments

### Option 6: Google Cloud Run
1. Push image to Google Container Registry
2. Deploy to Cloud Run
3. Configure environment variables
4. Set up HTTPS endpoint

## 🔧 Environment Variables

### For Local Development
Create `apps/web/.env`:
```env
VITE_API_BASE_URL=http://localhost:8080
```

### For Production
Set in your deployment platform:
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

**Important:** 
- Vite environment variables must start with `VITE_`
- They are embedded at build time, not runtime
- You need to rebuild the image if you change the API URL

## 📝 Azure Static Web Apps Deployment

### Using Azure Portal:
1. Create Static Web App resource
2. Connect to GitHub repository
3. Set build configuration:
   - App location: `apps/web`
   - Api location: (leave empty)
   - Output location: `dist`
4. Add App Setting:
   - Name: `VITE_API_BASE_URL`
   - Value: `https://your-api-url.com`

### Using Azure CLI:
```bash
az staticwebapp create \
  --name doormeen-web \
  --resource-group doormeen-rg \
  --location eastus2 \
  --branch main \
  --app-location "apps/web" \
  --output-location "dist" \
  --login-with-github
```

## 🔍 Troubleshooting

### Build Fails - Missing Environment Variable
- Ensure `.env` file exists with `VITE_API_BASE_URL`
- Or pass it as build arg: `--build-arg VITE_API_BASE_URL=...`

### API Calls Fail - CORS Issues
- Check backend CORS configuration
- Ensure frontend domain is allowed in backend CORS settings
- Verify `VITE_API_BASE_URL` is correct

### Port Already in Use
Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "3001:80"  # Use 3001 on host instead
```

### Changes Not Reflecting
- Rebuild the image: `docker-compose up --build`
- Clear browser cache
- Check if environment variables changed (requires rebuild)

### nginx 404 Errors
- Verify React Router configuration
- Check nginx.conf has the `try_files` directive for SPA routing

## 🎯 Production Checklist

- [ ] `VITE_API_BASE_URL` set to production API URL
- [ ] HTTPS enabled for frontend
- [ ] HTTPS enabled for API
- [ ] CORS configured correctly on backend
- [ ] Environment variables set in deployment platform
- [ ] Custom domain configured (if applicable)
- [ ] CDN configured for static assets
- [ ] Error tracking/monitoring set up
- [ ] Analytics configured (if needed)
- [ ] SEO meta tags verified

## 🔄 Running Both Frontend and Backend Together

### Option 1: Separate Containers
Run each in its own terminal:
```powershell
# Terminal 1 - Backend
cd apps\api\Api
docker-compose up

# Terminal 2 - Frontend
cd apps\web
docker-compose up
```

### Option 2: Combined docker-compose.yml
Create a root `docker-compose.yml`:
```yaml
services:
  api:
    build: ./apps/api/Api
    ports:
      - "8080:8080"
    env_file:
      - ./apps/api/Api/.env

  web:
    build:
      context: ./apps/web
      args:
        - VITE_API_BASE_URL=http://api:8080
    ports:
      - "3000:80"
    depends_on:
      - api
```

Then run from root:
```powershell
docker-compose up --build
```

## 📚 Additional Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Router Documentation](https://reactrouter.com/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Azure Static Web Apps](https://docs.microsoft.com/azure/static-web-apps/)
- [Docker Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

