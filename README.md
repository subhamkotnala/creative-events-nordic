
# 🇸🇪 Creative Events Marketplace - Deployment Guide

This application is ready for production. Follow these steps to deploy it to the web.

## 🚀 Recommended: Vercel or Netlify

These platforms are ideal for React applications and offer free tiers for static hosting.

### 1. Vercel (Easiest)
1. Push your code to a **GitHub repository**.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select your repository.
4. **CRITICAL:** Expand the **"Environment Variables"** section and add:
   - **Key**: `API_KEY`
   - **Value**: `[Your Google Gemini API Key]`
5. Click **"Deploy"**. Vercel will automatically build the project using Vite.

### 2. Netlify
1. Connect your GitHub account to [Netlify](https://www.netlify.com).
2. Choose your repository.
3. Use the default build settings (Build Command: `npm run build`, Publish directory: `dist`).
4. Under **"Site Configuration" > "Environment Variables"**, add your `API_KEY`.
5. Deploy your site.

## 🛠 Local Production Build

To test the production build locally:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the project:
   ```bash
   npm run build
   ```
3. Preview the build:
   ```bash
   npm run preview
   ```

## 🔑 API Key Management

The app relies on the `API_KEY` environment variable for Gemini AI features (Chatbot, AI Description, etc.). 
- **In Development:** Add it to your `.env` file as `VITE_GEMINI_API_KEY`.
- **In Production:** Set it in your host's dashboard (Vercel/Netlify/Heroku).

## 🗄️ Database Note
This version uses **IndexedDB** (via `services/db.ts`) for data persistence. This ensures that vendor data, admin approvals, and vendor profiles persist within the user's browser across sessions without requiring a complex backend setup.
