# Archaeological Site Form - Writable Version

A complete, production-ready form for creating archaeological site entries in your Timna Wikibase with **full write access**.

## Features

✅ **Full Write Access** - Creates actual items in your Wikibase
✅ **Secure Authentication** - Uses bot credentials via backend proxy
✅ **Complete Site Data** - All fields from your archaeological site structure
✅ **Geographic Information** - WGS-84 and ITM coordinates
✅ **Dating & Periods** - Archaeological periods and dating methods
✅ **Multiple Values** - Select multiple functions, artifacts, dating methods
✅ **Progress Tracking** - Real-time progress indicator during creation
✅ **Recent Sites** - See your last 5 created sites
✅ **User-Friendly** - Clean, intuitive interface for team members

## Architecture

This solution uses a **backend proxy server** to bypass CORS restrictions and handle authentication securely:

```
[Browser Form] → [Node.js Proxy Server] → [Wikibase API]
```

### Benefits:
- Bot credentials never exposed to browser
- No CORS issues
- Works with any Wikibase Cloud instance
- Can deploy to free hosting (Vercel, Netlify, Railway)

## Setup

### 1. Prerequisites

- Node.js installed (version 14 or higher)
- Bot credentials from your Wikibase

### 2. Get Bot Credentials

1. Go to https://timna-database.wikibase.cloud/wiki/Special:BotPasswords
2. Create a new bot password
3. Grant these permissions:
   - ✓ Edit existing pages
   - ✓ Create, edit, and move pages
   - ✓ High-volume editing
4. Save the bot name and password

### 3. Install Dependencies

```bash
cd wikibase-ontology-editor
npm install
```

### 4. Start the Server

```bash
npm start
```

The server will start on http://localhost:3000

### 5. Access the Form

Open your browser to:
```
http://localhost:3000/site-form.html
```

## Usage

### Creating a Site

1. **Login**
   - Enter your bot username (e.g., `YourName@BotName`)
   - Enter your bot password
   - Click "Login"

2. **Fill in Site Information**

   **Basic Information** (Required)
   - Site Name
   - Description
   - Site Identifier (number)

   **IAA Information** (Optional)
   - IAA Name, ID, Map, Link

   **Geographic Information** (Required)
   - Latitude & Longitude (WGS-84)
   - Optional: ITM coordinates, Altitude, Polygon Area

   **Dating & Period** (Required)
   - Archaeological Period
   - Optional: Date range (BCE), Dating methods

   **Site Function & Features** (Optional)
   - Site functions (Smelting, Burial, etc.)
   - Artifact types found

   **Research Information** (Required)
   - Select the research project

3. **Submit**
   - Click "Create Archaeological Site"
   - Watch the progress indicator
   - Get the new site ID when complete

### Important Notes

- **Required fields** are marked with *
- You can **select multiple** values in dropdown lists by holding Ctrl/Cmd
- The form automatically adds "Instance of: Archaeological Site" to every entry
- All coordinates should be in **decimal format** (e.g., 29.787654)
- Use **negative numbers for BCE** dates (e.g., -1219 for 1219 BCE)

## Property IDs

The form uses these property IDs (adjust in [site-form.js](site-form.js:11) if yours are different):

| Field | Property ID | Type |
|-------|-------------|------|
| Instance Of | P110 | Item |
| Identifier | P226 | Number |
| Research Project | P173 | Item |
| IAA Name | P13 | Text |
| IAA ID | P14 | Number |
| IAA Map | P15 | Number |
| IAA Link | P16 | URL |
| Description | P80 | Text |
| Latitude | P27 | Number |
| Longitude | P26 | Number |
| X ITM | P23 | Number |
| Y ITM | P24 | Number |
| Altitude | P25 | Number |
| Polygon Area | P189 | Number |
| Archaeological Period | P93 | Item |
| Date Range | P201 | Date |
| Dating Method | P104 | Item |
| Site Function | P227 | Item |
| Artifact Type | P193 | Item |

## Customization

### Changing Property IDs

Edit the `PROPERTIES` object in [site-form.js](site-form.js:11):

```javascript
const PROPERTIES = {
    INSTANCE_OF: 'P110',  // Change to your property IDs
    IDENTIFIER: 'P226',
    // ... etc
};
```

### Adding Dropdown Options

Edit the load functions in [site-form.js](site-form.js):

```javascript
async function loadPeriods() {
    const periods = [
        { id: 'Q7', label: 'Late Bronze Age' },
        { id: 'Q8', label: 'Iron Age I' },
        // Add more periods here
    ];
    // ...
}
```

### Styling

All visual styling is in [site-form.css](site-form.css). You can customize:
- Colors (CSS variables at the top)
- Fonts
- Layout
- Button styles

## Deployment

### Deploy to Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - `WIKIBASE_URL=https://timna-database.wikibase.cloud`

4. Your form will be live at: `https://your-project.vercel.app/site-form.html`

### Deploy to Railway

1. Go to [Railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Add environment variable: `WIKIBASE_URL`
4. Railway will auto-deploy from your repo

## Security

- ✓ Bot credentials stored server-side only
- ✓ Session-based authentication
- ✓ Sessions expire after 1 hour
- ✓ HTTPS recommended for production
- ✓ `.env` file excluded from git

**Important:** Never commit your `.env` file or expose bot credentials in client-side code!

## Troubleshooting

### "Login failed"
- Check bot credentials are correct
- Ensure bot has proper permissions
- Verify Wikibase URL is correct

### "Session expired"
- Sessions expire after 1 hour
- Click "Logout" and log in again

### Properties not saving
- Check property IDs match your Wikibase
- Verify bot has edit permissions
- Check browser console for errors

### Server won't start
- Ensure Node.js is installed
- Run `npm install` first
- Check port 3000 is not in use

## API Endpoints

The proxy server provides these endpoints:

- `POST /api/login` - Authenticate with bot credentials
- `POST /api/create-item` - Create new item
- `POST /api/add-claim` - Add property to item
- `POST /api/set-label` - Update labels/descriptions
- `GET /api/health` - Health check

## Support

For issues or questions:
1. Check the browser console for errors
2. Check the server console for errors
3. Verify your property IDs match your Wikibase
4. Ensure bot permissions are correctly set

## License

ISC
