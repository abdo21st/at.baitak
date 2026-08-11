import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'لم يتم اختيار أي ملف' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = join(uploadsDir, fileName);

    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      file: {
        fileName: file.name,
        filePath: `/uploads/${fileName}`,
        fileType: file.type
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'خطأ في رفع الملف' }, { status: 500 });
  }
}
