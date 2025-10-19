import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Chat from '@/models/Chat';

// GET a specific chat
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const chat = await Chat.findById(params.id);

    if (!chat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, chat });
  } catch (error: any) {
    console.error('Get chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

// PUT add a message to existing chat
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const { message } = await request.json();

    if (!message || !message.role || !message.content) {
      return NextResponse.json(
        { success: false, message: 'Invalid message format' },
        { status: 400 }
      );
    }

    const chat = await Chat.findByIdAndUpdate(
      params.id,
      {
        $push: { messages: { ...message, timestamp: new Date() } },
        $set: { updatedAt: new Date() },
      },
      { new: true }
    );

    if (!chat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, chat });
  } catch (error: any) {
    console.error('Update chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE a chat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();

    const chat = await Chat.findByIdAndDelete(params.id);

    if (!chat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Chat deleted successfully' });
  } catch (error: any) {
    console.error('Delete chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
