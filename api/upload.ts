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

        console.log('Request headers:', req.headers);
        const [fields, files] = await form.parse(req);
        console.log('Parsed files:', JSON.stringify(files, (key, value) =>
            key === 'filepath' ? value : value, 2
        ));

        const file = files.file?.[0];
        if (!file || !file.filepath) {
            return res.status(400).json({ error: 'No file uploaded or file path is missing' });
        }

        // Verify file exists and has content
        const stats = fs.statSync(file.filepath);
        console.log('File stats:', stats);

        if (stats.size === 0) {
            return res.status(400).json({ error: 'Uploaded file is empty' });
        }


        const privateKey = process.env.GOOGLE_PRIVATE_KEY;
        const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

        if (!privateKey || !clientEmail || !folderId) {
            console.error('Missing Google Drive configuration:', {
                hasKey: !!privateKey,
                hasEmail: !!clientEmail,
                hasFolder: !!folderId
            });
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Google Drive credentials are not properly configured.'
            });
        }

        // Diagnostic log for the key (safe)
        console.log('Key diagnostic:', {
            length: privateKey?.length,
            startsWithHeader: privateKey?.includes('BEGIN PRIVATE KEY'),
            hasEscapedNewline: privateKey?.includes('\\n'),
            hasRealNewline: privateKey?.includes('\n'),
        });

        // Format the private key correctly for OpenSSL
        let formattedKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();

        // If it's all on one line (common copy-paste issue), it will fail OpenSSL 3 decoding
        if (formattedKey.includes('-----BEGIN PRIVATE KEY-----') && !formattedKey.includes('\n', 30)) {
            console.log('Fixing one-line private key format');
            formattedKey = formattedKey
                .replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n')
                .replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');
        }

        // Setup Google Drive API
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
