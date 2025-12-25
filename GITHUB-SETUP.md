# GitHub Repository Setup Instructions

## Step 1: Create the Repository on GitHub

1. Go to [GitHub](https://github.com) and log in
2. Click the "+" icon in the top-right corner
3. Select "New repository"
4. Fill in the details:
   - **Repository name**: `timna-db`
   - **Description**: `Wikibase ontology editor with dynamic form generation for the Timna archaeological database`
   - **Visibility**: Choose Public or Private based on your preference
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
5. Click "Create repository"

## Step 2: Push Your Code

After creating the repository on GitHub, you'll see instructions. Use these commands:

```bash
# Add the remote repository
git remote add origin https://github.com/YOUR_USERNAME/timna-db.git

# Push your code
git push -u origin master
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Verify

Go to your repository URL: `https://github.com/YOUR_USERNAME/timna-db`

You should see all your files uploaded!

## Alternative: Using SSH

If you prefer SSH authentication:

```bash
# Add the remote repository (SSH)
git remote add origin git@github.com:YOUR_USERNAME/timna-db.git

# Push your code
git push -u origin master
```

## Troubleshooting

### Error: "remote origin already exists"
```bash
# Remove the existing remote
git remote remove origin

# Then add the new one
git remote add origin https://github.com/YOUR_USERNAME/timna-db.git
```

### Error: Authentication failed
- For HTTPS: Make sure you're using a Personal Access Token instead of your password
  - Go to GitHub Settings → Developer settings → Personal access tokens
  - Generate a new token with 'repo' scope
  - Use the token as your password when prompted

---

**Note**: Your code is already committed locally. Once you create the GitHub repository and run the push commands, all your files will be uploaded!
