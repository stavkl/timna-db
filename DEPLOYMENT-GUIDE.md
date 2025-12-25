# Deployment Guide - Share Form with Your Team

This guide shows how to deploy the Archaeological Site Form so your team can access it from anywhere without running a local server.

## Overview

You deploy the backend server **once** to a hosting service, then share a URL with your team. They just open the URL in their browser - no installation needed!

```
You Deploy:        [Backend Server on Vercel/Railway]
                            ↓
Team Members Use:  [https://your-site.vercel.app/site-form.html]
```

---

## Option 1: Vercel (Recommended - Easiest)

**Best for:** Quick deployment, free tier, automatic HTTPS

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

This will open a browser window - sign in with GitHub, GitLab, or email.

### Step 3: Deploy

From your project directory:

```bash
cd C:\Users\klein\Desktop\Projects\wikibase-ontology-editor
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Select your account
- **Link to existing project?** No
- **Project name?** timna-site-form (or any name you like)
- **Directory?** Just press Enter (uses current directory)
- **Override settings?** No

### Step 4: Set Environment Variables

After deployment, set environment variables:

```bash
vercel env add WIKIBASE_URL
```
Enter: `https://timna-database.wikibase.cloud`

### Step 5: Redeploy with Environment Variables

```bash
vercel --prod
```

### Step 6: Get Your URL

Vercel will give you a URL like:
```
https://timna-site-form.vercel.app
```

**Share this with your team:**
```
https://timna-site-form.vercel.app/site-form.html
```

### Managing Your Deployment

- **View deployments:** `vercel ls`
- **Check logs:** `vercel logs`
- **Remove project:** `vercel remove`

---

## Option 2: Railway (Also Free & Easy)

**Best for:** Persistent backend, includes database options

### Step 1: Create Railway Account

Go to https://railway.app and sign up with GitHub.

### Step 2: Install Railway CLI (Optional)

```bash
npm install -g @railway/cli
```

### Step 3: Deploy via GitHub (Recommended)

1. **Push your code to GitHub:**
   ```bash
   cd C:\Users\klein\Desktop\Projects\wikibase-ontology-editor
   git add .
   git commit -m "Add archaeological site form"
   git push
   ```

2. **Go to Railway Dashboard:**
   - Visit https://railway.app/dashboard
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will auto-detect Node.js and deploy

3. **Add Environment Variable:**
   - Click on your project
   - Go to "Variables" tab
   - Add variable:
     - Key: `WIKIBASE_URL`
     - Value: `https://timna-database.wikibase.cloud`

4. **Get Your URL:**
   - Go to "Settings" tab
   - Click "Generate Domain"
   - You'll get a URL like: `https://timna-site-form.up.railway.app`

**Share with team:**
```
https://timna-site-form.up.railway.app/site-form.html
```

### Alternative: Deploy via CLI

```bash
railway login
railway init
railway up
railway open
```

---

## Option 3: Render (Free Tier Available)

**Best for:** Static sites with backend functions

### Steps:

1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** timna-site-form
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add environment variable:
   - Key: `WIKIBASE_URL`
   - Value: `https://timna-database.wikibase.cloud`
6. Click "Create Web Service"

Your URL will be: `https://timna-site-form.onrender.com/site-form.html`

---

## Option 4: Heroku (Requires Credit Card)

**Best for:** Enterprise deployments

### Steps:

```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create timna-site-form

# Set environment variable
heroku config:set WIKIBASE_URL=https://timna-database.wikibase.cloud

# Deploy
git push heroku main

# Open app
heroku open
```

---

## After Deployment: Sharing with Team

Once deployed, your team members can:

1. **Open the URL** in any browser (Chrome, Firefox, Safari, Edge)
   ```
   https://your-app.vercel.app/site-form.html
   ```

2. **Login** with their bot credentials
   - Each team member needs their own bot account
   - Create at: https://timna-database.wikibase.cloud/wiki/Special:BotPasswords

3. **Fill in the form** and create sites

### Creating Bot Accounts for Team Members

For each team member:

1. They log into Wikibase with their regular account
2. Go to https://timna-database.wikibase.cloud/wiki/Special:BotPasswords
3. Click "Create a new bot password"
4. Grant permissions:
   - ✓ High-volume editing
   - ✓ Edit existing pages
   - ✓ Create, edit, and move pages
5. Save the bot name and password
6. Use these to login to your deployed form

---

## Security Best Practices

### ✅ Do:
- Use HTTPS (all hosting services provide this automatically)
- Tell team members to keep their bot passwords private
- Regularly review bot permissions in Wikibase
- Use environment variables for configuration (never hardcode URLs)

### ❌ Don't:
- Share bot credentials between team members (each person should have their own)
- Commit `.env` file to git (it's already in `.gitignore`)
- Hardcode credentials in JavaScript files

---

## Updating the Form After Deployment

### If using Vercel:
```bash
# Make your changes, then:
vercel --prod
```

### If using Railway with GitHub:
```bash
git add .
git commit -m "Update form"
git push
# Railway auto-deploys on push!
```

### If using Render:
- Render auto-deploys when you push to GitHub

---

## Cost Comparison

| Service | Free Tier | Best For |
|---------|-----------|----------|
| **Vercel** | 100GB bandwidth/month | Quick deployment, small teams |
| **Railway** | $5 free credit/month (~500 hours) | Persistent backend |
| **Render** | 750 hours/month | Always-on apps |
| **Heroku** | Requires credit card | Enterprise features |

**Recommendation:** Start with **Vercel** - it's the easiest and most generous free tier for your use case.

---

## Quick Start (TL;DR)

**Fastest way to deploy right now:**

```bash
# Install Vercel
npm install -g vercel

# Deploy
cd C:\Users\klein\Desktop\Projects\wikibase-ontology-editor
vercel

# Follow prompts, then set environment variable
vercel env add WIKIBASE_URL
# Enter: https://timna-database.wikibase.cloud

# Deploy to production
vercel --prod

# You'll get a URL - share it with your team!
```

---

## Troubleshooting

### "Cannot find module" error
Make sure `package.json` and `node_modules` are deployed:
```bash
git add package.json package-lock.json
git commit -m "Add dependencies"
```

### Form won't load
Check that you set the environment variable `WIKIBASE_URL`

### Login fails
- Verify bot credentials are correct
- Check that Wikibase URL is accessible
- Check server logs for errors

### Need help?
Most hosting services have great documentation:
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app
- Render: https://render.com/docs

---

## Next Steps

After deployment:

1. ✅ Test the form yourself
2. ✅ Create bot accounts for team members
3. ✅ Share the URL
4. ✅ Provide login instructions
5. ✅ Monitor the first few entries to ensure data quality

---

## Support

If you need help:
1. Check the hosting service's logs
2. Check browser console for errors (F12)
3. Verify environment variables are set
4. Test bot credentials work in Wikibase directly
