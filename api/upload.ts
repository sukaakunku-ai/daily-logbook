import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { formidable } from 'formidable';
import fs from 'fs';

// Disable body parsing, we'll use formidable
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    console.log('API_VERSION: 1.0.3');
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
            console.error('Missing Google Drive configuration');
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Google Drive credentials are not properly configured.'
            });
        }

        // --- NEW ROBUST KEY REPAIR LOGIC ---
        let formattedKey = privateKey
            .replace(/^['"]|['"]$/g, '') // Remove start/end quotes
            .replace(/\\n/g, '\n')       // Convert literal \n to real newlines
            .trim();

        // Ensure it starts/ends correctly
        if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
            formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey}`;
        }
        if (!formattedKey.includes('-----END PRIVATE KEY-----')) {
            formattedKey = `${formattedKey}\n-----END PRIVATE KEY-----`;
        }

        // If the key body is all on one line, OpenSSL 3.0+ will fail. 
        // We need to wrap it to 64 chars if it's not already multiline.
        const body = formattedKey
            .replace('-----BEGIN PRIVATE KEY-----', '')
            .replace('-----END PRIVATE KEY-----', '')
            .replace(/\s/g, ''); // Remove all whitespace

        formattedKey = `-----BEGIN PRIVATE KEY-----\n${body.match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;

        console.log('Key repair diagnostic:', {
            originalLength: privateKey.length,
            repairedLength: formattedKey.length,
            linesCount: formattedKey.split('\n').length
        });
        // -----------------------------------

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
