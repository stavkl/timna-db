# Vercel Deployment Guide

## Quick Deploy via Vercel Website

### Step 1: Push to GitHub ✓ (Already Done!)

Your code is already on GitHub at: https://github.com/stavkl/timna-db

### Step 2: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com/signup

2. **Login with GitHub**
   - Click "Continue with GitHub"
   - Authorize Vercel

3. **Import Project**
   - Click "Add New..." → "Project"
   - Find `stavkl/timna-db` in the list
   - Click "Import"

4. **Configure Project**
   - Project Name: `timna-db` (or whatever you prefer)
   - Framework Preset: `Other`
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)

5. **Add Environment Variables** ⚠️ IMPORTANT
   Click "Environment Variables" and add:

   | Name | Value |
   |------|-------|
   | `WIKIBASE_URL` | `https://timna-database.wikibase.cloud` |

6. **Deploy**
   - Click "Deploy"
   - Wait 1-2 minutes for deployment
   - You'll get a URL like: `https://timna-db.vercel.app`

### Step 3: Test Your App

Once deployed, visit: `https://your-project-name.vercel.app/src/index.html`

**Test checklist:**
- [ ] Login with bot credentials works
- [ ] "New Archaeological Site" loads form correctly
- [ ] Properties show with multi-select dropdowns
- [ ] Can select multiple values
- [ ] Can add custom Q numbers
- [ ] "Create Item" button works
- [ ] Edit mode loads existing items
- [ ] Can update existing items

## Alternative: Deploy via CLI

If you want to use the CLI in the future:

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## Troubleshooting

### Issue: "404 Not Found"
**Solution**: Make sure you're visiting `/src/index.html` not just `/`

### Issue: "Login failed"
**Possible causes:**
1. Bot credentials incorrect
2. WIKIBASE_URL environment variable not set
3. CORS issues (unlikely with proxy)

**Check:**
- Vercel logs: Project → Deployments → Click deployment → Runtime Logs
- Browser console for errors

### Issue: "Failed to create entity"
**Check:**
- Bot has write permissions in Wikibase
- Session hasn't timed out
- Check Vercel Runtime Logs for server errors

### Issue: Environment variable not working
**Solution:**
1. Go to Vercel Project Settings → Environment Variables
2. Make sure `WIKIBASE_URL` is set for Production, Preview, and Development
3. Redeploy the project

## Redeployment

Every time you push to GitHub, Vercel will automatically redeploy!

```bash
git add .
git commit -m "Your changes"
git push origin master
```

Vercel will detect the push and redeploy within 1-2 minutes.

## Custom Domain (Optional)

To use your own domain:

1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

## Notes

- **Sessions**: In-memory sessions will reset on every deployment. For production, consider using Redis or a database.
- **Rate Limits**: Vercel free tier has limits. Monitor usage in dashboard.
- **Logs**: Check Runtime Logs for debugging server-side issues.

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
