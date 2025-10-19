import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import File from '@/models/File';

// GET all files for a user
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const files = await File.find({ userId })
      .sort({ uploadedAt: -1 })
      .select('name size type url uploadedAt');

    return NextResponse.json({ success: true, files });
  } catch (error: any) {
    console.error('Get files error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

// POST upload a new file
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { userId, name, size, type, url } = await request.json();

    if (!userId || !name || !size || !type || !url) {
      return NextResponse.json(
        { success: false, message: 'All fields are required' },
        { status: 400 }
      );
    }

    const file = await File.create({
      userId,
      name,
      size,
      type,
      url,
    });

    return NextResponse.json({ success: true, file });
  } catch (error: any) {
    console.error('Upload file error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE a file
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { success: false, message: 'File ID is required' },
        { status: 400 }
      );
    }

    const file = await File.findByIdAndDelete(fileId);

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'File deleted successfully' });
  } catch (error: any) {
    console.error('Delete file error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
