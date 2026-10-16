import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};base64,${base64}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'wowquiz',
      resource_type: 'image',
      transformation: [{ width: 1200, crop: 'limit', quality: 'auto:good' }],
    });

    return Response.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }
}
