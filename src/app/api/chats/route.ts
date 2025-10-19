import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Chat from '@/models/Chat';

// GET all chats for a user
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

    const chats = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      chats: chats.map(chat => ({
        id: chat._id.toString(),
        title: chat.title,
        messages: chat.messages.map((msg: any) => ({
          id: msg._id?.toString() || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          attachedFiles: msg.attachedFiles || [],
        })),
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error('Get chats error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

// POST create a new chat
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const { userId, title, messages } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'User ID is required' },
        { status: 400 }
      );
    }

    const chat = await Chat.create({
      userId,
      title: title || 'New Chat',
      messages: messages || [],
    });

    const chatData = chat.toObject();

    return NextResponse.json({
      success: true,
      chat: {
        id: chatData._id.toString(),
        title: chatData.title,
        messages: chatData.messages.map((msg: any) => ({
          id: msg._id?.toString() || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          attachedFiles: msg.attachedFiles || [],
        })),
        createdAt: chatData.createdAt,
        updatedAt: chatData.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Create chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

// PUT update an existing chat
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const { chatId, title, messages } = await request.json();

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: 'Chat ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (messages !== undefined) updateData.messages = messages;

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      updateData,
      { new: true }
    ).lean();

    if (!updatedChat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      chat: {
        id: updatedChat._id.toString(),
        title: updatedChat.title,
        messages: updatedChat.messages.map((msg: any) => ({
          id: msg._id?.toString() || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
          attachedFiles: msg.attachedFiles || [],
        })),
        createdAt: updatedChat.createdAt,
        updatedAt: updatedChat.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Update chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}

// DELETE a chat
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: 'Chat ID is required' },
        { status: 400 }
      );
    }

    const deletedChat = await Chat.findByIdAndDelete(chatId);

    if (!deletedChat) {
      return NextResponse.json(
        { success: false, message: 'Chat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete chat error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
