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

        // --- CLOUDINARY CONFIG (Cleaned) ---
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim().replace(/["']/g, '');
        const apiKey = process.env.CLOUDINARY_API_KEY?.trim().replace(/["']/g, '');
        const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim().replace(/["']/g, '');

        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error(`Cloudinary config missing: Name(${!!cloudName}), Key(${!!apiKey}), Secret(${!!apiSecret})`);
        }

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
        });

        // Extract metadata for naming
        const menuId = (req.headers['x-menu-id'] as string || 'default').replace(/[^a-zA-Z0-9]/g, '_');
        const fieldLabel = (req.headers['x-field-label'] as string || 'file').replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const originalName = file.originalFilename?.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_') || 'upload';

        // Construct descriptive Public ID: menu_formlabel_date_filename
        const customPublicId = `${menuId}_${fieldLabel}_${timestamp}_${originalName}`;

        console.log('Starting Cloudinary upload with ID:', customPublicId);

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.filepath, {
            folder: 'daily-logbook', // Optional: subfolder in Cloudinary
            resource_type: 'auto',   // Automatically detect if it's image, video, or raw file
            public_id: customPublicId,
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

