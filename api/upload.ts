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
        console.log('API_VERSION: 1.0.8');
        const form = formidable({ maxFiles: 1 });
        const [fields, files] = await form.parse(req);
        const file = files.file?.[0];

        if (!file || !file.filepath) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim();
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
        let folderIdInput = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';

        // --- VERSION 1.1.1: TOTAL CLEANING & VERIFICATION ---
        // Strip everything that isn't an alphanumeric character for the ID
        const folderId = folderIdInput.split(':').pop()?.replace(/[^a-zA-Z0-9_-]/g, '') || '';

        if (!privateKey || !clientEmail || !folderId) {
            throw new Error(`Config incomplete: Key(${!!privateKey}), Email(${!!clientEmail}), FolderID(${folderId})`);
        }

        console.log('API_VERSION: 1.1.1');
        console.log('Target Folder ID:', folderId);

        // Robust but light formatting
        const cleanKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();
        const auth = new google.auth.GoogleAuth({
            credentials: { client_email: clientEmail, private_key: cleanKey },
            scopes: ['https://www.googleapis.com/auth/drive.file'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // VERIFY FOLDER ACCESS FIRST
        try {
            const folderCheck = await drive.files.get({ fileId: folderId, fields: 'id, name' });
            console.log('Folder verification SUCCESS:', folderCheck.data.name);
        } catch (verifErr: any) {
            const googleError = verifErr.response?.data?.error?.message || verifErr.message;
            console.error('Folder verification FAILED:', googleError);
            throw new Error(`Google Drive says: "${googleError}". Check folder ID ${folderId} and permissions for ${clientEmail}.`);
        }


        console.log('Starting upload...');
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
            supportsAllDrives: true,
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
