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
    console.log('API_VERSION: 1.0.7');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const form = formidable({ maxFiles: 1 });
        const [fields, files] = await form.parse(req);
        const file = files.file?.[0];

        if (!file || !file.filepath) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const privateKey = process.env.GOOGLE_PRIVATE_KEY;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!privateKey || !clientEmail || !folderId) {
            throw new Error('Server configuration missing (Check Vercel Env Vars)');
        }

        // Standard private key formatting
        const formattedKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: formattedKey,
            },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        console.log('Starting Google Drive Upload...');
        const uploadedFile = await drive.files.create({
            requestBody: {
                name: file.originalFilename || 'uploaded-file',
                parents: [folderId],
            },
            media: {
                mimeType: file.mimetype || 'application/octet-stream',
                body: fs.createReadStream(file.filepath),
            },
            fields: 'id, name, webViewLink',
        });

        console.log('Upload successful:', uploadedFile.data.id);

        try {
            await drive.permissions.create({
                fileId: uploadedFile.data.id!,
                requestBody: { role: 'reader', type: 'anyone' },
            });
        } catch (permError) {
            console.warn('Could not set permissions, but file was uploaded');
        }

        fs.unlinkSync(file.filepath);

        return res.status(200).json({
            success: true,
            fileId: uploadedFile.data.id,
            fileName: uploadedFile.data.name,
            url: `https://drive.google.com/file/d/${uploadedFile.data.id}/view`,
            webViewLink: uploadedFile.data.webViewLink,
        });
    } catch (error: any) {
        console.error('Final Upload Error:', error.message);
        return res.status(500).json({
            error: 'Upload process failed',
            message: error.message
        });
    }
}
