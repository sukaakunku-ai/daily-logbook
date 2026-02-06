# Google Drive Upload - Environment Variables Setup

## ⚠️ IMPORTANT: DO NOT COMMIT SERVICE ACCOUNT JSON TO GITHUB!

The Service Account file contains sensitive credentials. We will add them to Vercel as environment variables instead.

## Step 1: Add Environment Variables to Vercel

1. Open https://vercel.com
2. Go to your project: **daily-logbook**
3. Click **Settings** > **Environment Variables**
4. Add the following 3 variables:

### Variable 1: GOOGLE_SERVICE_ACCOUNT_EMAIL
- **Name**: `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **Value**: `daily-logbook-uploader@pengeluaran-dd4d0.iam.gserviceaccount.com`
- **Environment**: Select all (Production, Preview, Development)

### Variable 2: GOOGLE_PRIVATE_KEY
- **Name**: `GOOGLE_PRIVATE_KEY`
- **Value**: Copy the ENTIRE `private_key` value from your JSON file, including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
  
  **IMPORTANT**: The value should look like this (all in one line is OK):
  ```
  -----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCua+M43/YcBdWm
... (rest of the key)
-----END PRIVATE KEY-----
  ```

- **Environment**: Select all (Production, Preview, Development)

### Variable 3: GOOGLE_DRIVE_FOLDER_ID
- **Name**: `GOOGLE_DRIVE_FOLDER_ID`
- **Value**: `1FlGkfpG_d5ij_eCrZx2lUU1yQ6xcGnrE`
- **Environment**: Select all (Production, Preview, Development)

## Step 2: Redeploy

After adding all 3 environment variables:
1. Go to the **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Wait for the build to complete

## Step 3: Test Upload

1. Open your app: https://daily-logbook.vercel.app
2. Create or edit an entry with a file field
3. Upload a file
4. You should see: "File uploaded successfully to Google Drive!"
5. Check the Google Drive folder to confirm the file is there

## Viewing Uploaded Files

When a file is uploaded, it returns:
- **fileId**: Google Drive file ID
- **fileName**: Original filename
- **url**: Direct link to view the file (format: `https://drive.google.com/file/d/{fileId}/view`)
- **webViewLink**: Google's web view link

The link will be stored in Firestore and shown in the entry data.

---

## Security Notes:

✅ Service Account credentials are stored securely in Vercel environment variables  
✅ The private key is never committed to GitHub  
✅ Uploaded files are set to "anyone with the link can view"  
✅ All files go to the specified Google Drive folder only
