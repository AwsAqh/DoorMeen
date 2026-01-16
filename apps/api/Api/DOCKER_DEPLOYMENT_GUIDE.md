# Docker Deployment Guide for DoorMeen API

## 📋 Prerequisites

- Docker Desktop installed and running
- `.env` file configured with your database connection and JWT settings
- Docker Compose (included with Docker Desktop)

## 🚀 Quick Start - Running Locally with Docker

### Step 1: Navigate to the API Directory
```powershell
cd apps\api\Api
```

### Step 2: Build and Run with Docker Compose
```powershell
docker-compose up --build
```

This will:
- Build the Docker image from the Dockerfile
- Create and start the container
- Map port 8080 from container to your host
- Load environment variables from `.env` file

### Step 3: Verify It's Running
Open your browser or use curl:
```powershell
curl http://localhost:8080/health
```

You should see:
```json
{"ok":true,"time":"2026-01-02T..."}
```

### Step 4: Stop the Container
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
docker build -t doormeen-api:latest .
```

### Tag for Registry (e.g., Docker Hub)
```powershell
docker tag doormeen-api:latest yourusername/doormeen-api:latest
```

### Push to Docker Hub
```powershell
docker login
docker push yourusername/doormeen-api:latest
```

## ☁️ Deployment Options

### Option 1: Azure Container Instances (ACI)
1. Push image to Azure Container Registry (ACR)
2. Create container instance with environment variables
3. Configure networking and ports

### Option 2: Azure App Service (Container)
1. Push image to ACR or Docker Hub
2. Create App Service with container deployment
3. Configure environment variables in App Service settings
4. Set connection string and JWT settings as App Settings

### Option 3: Azure Container Apps
1. Push image to ACR
2. Create Container App
3. Configure environment variables
4. Set up ingress (HTTP/HTTPS)

### Option 4: AWS ECS/Fargate
1. Push image to ECR (Elastic Container Registry)
2. Create ECS task definition
3. Configure environment variables
4. Deploy to Fargate or EC2

### Option 5: Google Cloud Run
1. Push image to Google Container Registry
2. Deploy to Cloud Run
3. Configure environment variables
4. Set up HTTPS endpoint

## 🔧 Environment Variables for Deployment

When deploying to cloud platforms, set these environment variables:

```env
ConnectionStrings__Default=Host=your-db-host;Port=5432;Database=doormeen;Username=user;Password=pass;Ssl Mode=Require;
Jwt__Issuer=DoorMeen
Jwt__Audience=DoorMeenClient
Jwt__Key=your-secret-key-here
Jwt__ExpiresMinutes=3600
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080
```

**Note:** In cloud platforms, use their environment variable configuration UI instead of `.env` file.

## 📝 Azure App Service Deployment Example

### Using Azure CLI:
```bash
# Login to Azure
az login

# Create resource group
az group create --name doormeen-rg --location eastus

# Create App Service Plan
az appservice plan create --name doormeen-plan --resource-group doormeen-rg --sku B1 --is-linux

# Create Web App with container
az webapp create --resource-group doormeen-rg --plan doormeen-plan --name doormeen-api --deployment-container-image-name yourregistry.azurecr.io/doormeen-api:latest

# Set environment variables
az webapp config appsettings set --resource-group doormeen-rg --name doormeen-api --settings \
  ConnectionStrings__Default="Host=..." \
  Jwt__Issuer="DoorMeen" \
  Jwt__Audience="DoorMeenClient" \
  Jwt__Key="your-key" \
  Jwt__ExpiresMinutes="3600"

# Configure port
az webapp config set --resource-group doormeen-rg --name doormeen-api --linux-fx-version "DOCKER|yourregistry.azurecr.io/doormeen-api:latest"
```

## 🔍 Troubleshooting

### Container Won't Start
- Check logs: `docker-compose logs`
- Verify `.env` file exists and has correct values
- Ensure port 8080 is not in use: `netstat -ano | findstr :8080`

### Database Connection Issues
- Verify connection string format (Npgsql format, not URI)
- Check if database allows connections from your IP
- Ensure SSL mode is set correctly

### Build Errors
- Make sure Docker Desktop is running
- Clear Docker cache: `docker system prune -a`
- Rebuild: `docker-compose build --no-cache`

### Port Already in Use
Change the port mapping in `docker-compose.yml`:
```yaml
ports:
  - "8081:8080"  # Use 8081 on host instead
```

## 🎯 Production Checklist

- [ ] Environment variables configured securely
- [ ] Database connection string verified
- [ ] JWT secret key is strong and unique
- [ ] SSL/TLS enabled for database connection
- [ ] Container runs on port 8080 internally
- [ ] Health endpoint accessible
- [ ] Logs are being collected
- [ ] Monitoring/alerting configured
- [ ] Backup strategy for database
- [ ] CORS origins updated for production domain

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Azure App Service Containers](https://docs.microsoft.com/azure/app-service/containers/)
- [.NET Docker Images](https://hub.docker.com/_/microsoft-dotnet)

