import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { formidable } from 'formidable';
import fs from 'fs';
import crypto from 'crypto';

// Disable body parsing, we'll use formidable
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('API_VERSION: 1.0.5');

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Parse form data
        const form = formidable({
            allowEmptyFiles: true,
            minFileSize: 0,
            maxFiles: 1,
        });

        const [fields, files] = await form.parse(req);
        const file = files.file?.[0];
        if (!file || !file.filepath) {
            return res.status(400).json({ error: 'No file uploaded or file path is missing' });
        }

        const stats = fs.statSync(file.filepath);
        if (stats.size === 0) {
            return res.status(400).json({ error: 'Uploaded file is empty' });
        }

        const privateKey = process.env.GOOGLE_PRIVATE_KEY;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!privateKey || !clientEmail || !folderId) {
            console.error('Missing configuration');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Google Drive credentials are not properly configured.'
            });
        }

        // --- VERSION 1.0.5: ULTRA ROBUST KEY REPAIR ---
        // 1. Strip everything to find the base64 content
        let cleanBody = privateKey
            .replace(/\\n/g, '')
            .replace(/---.*---/g, '')
            .replace(/[^a-zA-Z0-9+/=]/g, ''); // Keep ONLY base64 characters

        // 2. Reconstruct the PEM format perfectly
        const header = '-----BEGIN PRIVATE KEY-----';
        const footer = '-----END PRIVATE KEY-----';
        const wrappedBody = cleanBody.match(/.{1,64}/g)?.join('\n');
        const formattedKey = `${header}\n${wrappedBody}\n${footer}`;

        // 3. Diagnostic Logging
        console.log('Key repair 1.0.5 status:', {
            inputLength: privateKey.length,
            bodyLength: cleanBody.length,
            startCodes: privateKey.substring(0, 10).split('').map(c => c.charCodeAt(0))
        });

        // 4. Validate locally
        try {
            crypto.createPrivateKey(formattedKey);
            console.log('Local crypto validation: SUCCESS');
        } catch (err: any) {
            console.error('Local crypto validation: FAILED', err.message);
            return res.status(500).json({
                error: 'Final Key Reconstruction Failed',
                details: err.message,
                diagnostics: {
                    inputStart: privateKey.substring(0, 15),
                    inputEnd: privateKey.substring(privateKey.length - 15)
                }
            });
        }
        // ----------------------------------------------

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: formattedKey,
            },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });




        // Upload to Google Drive
        const fileMetadata = {
            name: file.originalFilename || 'uploaded-file',
            parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
        };

        const media = {
            mimeType: file.mimetype || 'application/octet-stream',
            body: fs.createReadStream(file.filepath),
        };

        const uploadedFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink',
        });

        // Make file publicly accessible
        await drive.permissions.create({
            fileId: uploadedFile.data.id!,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Get the public URL
        const publicUrl = `https://drive.google.com/file/d/${uploadedFile.data.id}/view`;

        // Clean up temp file
        fs.unlinkSync(file.filepath);

        return res.status(200).json({
            success: true,
            fileId: uploadedFile.data.id,
            fileName: uploadedFile.data.name,
            url: publicUrl,
            webViewLink: uploadedFile.data.webViewLink,
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return res.status(500).json({
            error: 'Upload failed',
            message: error.message
        });
    }
}
