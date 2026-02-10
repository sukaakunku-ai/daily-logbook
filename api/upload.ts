import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';
import { formidable } from 'formidable';
import fs from 'fs';

// Disable body parsing, we'll use formidable
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const form = formidable({ maxFiles: 1 });
        const [fields, files] = await form.parse(req);
        const file = files.file?.[0];

        if (!file || !file.filepath) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // --- CLOUDINARY CONFIG ---
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });

        console.log('Starting Cloudinary upload...');

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.filepath, {
            folder: 'daily-logbook', // Optional: subfolder in Cloudinary
            resource_type: 'auto',   // Automatically detect if it's image, video, or raw file
            public_id: `${Date.now()}-${file.originalFilename?.replace(/[^a-zA-Z0-9]/g, '_')}`,
        });

        console.log('Cloudinary upload successful:', result.public_id);

        // Cleanup local temp file
        if (fs.existsSync(file.filepath)) {
            fs.unlinkSync(file.filepath);
        }

        return res.status(200).json({
            success: true,
            fileId: result.public_id,
            fileName: file.originalFilename || result.original_filename,
            url: result.secure_url,
            webViewLink: result.secure_url, // For Cloudinary, secure_url is the direct viewable link
        });
    } catch (error: any) {
        console.error('Cloudinary Upload Error:', error.message);
        return res.status(500).json({
            error: 'Upload process failed',
            message: error.message
        });
    }
}

