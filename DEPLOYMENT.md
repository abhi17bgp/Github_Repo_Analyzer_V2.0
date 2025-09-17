# Deployment Guide

This guide explains how to deploy the GitHub Analyzer application with separate frontend and backend services.

## Prerequisites

1. Separate package.json files for frontend and backend
2. Environment variables configured for both services
3. Accounts on Render (for backend) and Vercel (for frontend)

## Backend Deployment (Render)

### 1. Environment Variables

Set the following environment variables in your Render dashboard:

- `NODE_ENV`: production
- `PORT`: 5000 (or let Render auto-assign)
- `JWT_SECRET`: A secure random string for JWT token generation
- `MONGODB_URI`: Your MongoDB connection string
- `GEMINI_API_KEY`: Your Google Gemini API key (optional)
- `GITHUB_TOKEN`: Your GitHub personal access token (optional, for higher rate limits)

### 2. Render Configuration

The `render.yaml` file in the root directory defines the deployment configuration:

```yaml
services:
  - type: web
    name: github-analyzer-backend
    env: node
    plan: free
    buildCommand: npm install
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
```

### 3. Deployment Steps

1. Connect your GitHub repository to Render
2. Select the root directory for the backend service
3. Set the environment variables in the Render dashboard
4. Deploy the service

## Frontend Deployment (Vercel)

### 1. Environment Variables

Set the following environment variable in your Vercel dashboard:

- `VITE_API_BASE_URL`: The URL of your deployed backend service (e.g., https://your-backend-service.onrender.com/api)

### 2. Vercel Configuration

Vercel automatically detects the Vite project and configures the build settings:

- Build Command: `npm run build`
- Output Directory: `dist`
- Development Command: `npm run dev`

### 3. Deployment Steps

1. Connect your GitHub repository to Vercel
2. Select the root directory for the frontend service
3. Set the environment variables in the Vercel dashboard
4. Deploy the service

## Local Development

### Environment Files

- Frontend: Create a `.env` file in the root directory with:

  ```
  VITE_API_BASE_URL=http://localhost:5000/api
  ```

- Backend: The `server/.env` file should contain all necessary environment variables

### Running Locally

1. Start the backend server:

   ```bash
   cd server
   npm install
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   npm install
   npm run dev
   ```

## Troubleshooting

### CORS Issues

If you encounter CORS issues, ensure your backend is configured to accept requests from your frontend domain. The CORS configuration is in `server/server.js`.

### Environment Variables Not Loading

Ensure that environment variables are correctly set in the respective dashboards and that you've restarted the services after making changes.

### API Connection Issues

Verify that:

1. The backend service is running
2. The `VITE_API_BASE_URL` in the frontend matches the backend URL
3. The backend is configured to accept requests from the frontend domain
