"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import MessageContent from "@/components/MessageContent";

interface UploadedFile {
  _id: string;
  name: string;
  size: number;
  uploadedAt: string;
  type: string;
  url: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachedFiles?: UploadedFile[];
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export default function Dashboard() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [attachedPDF, setAttachedPDF] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState<string>('');
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [pdfViewerURL, setPdfViewerURL] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  // Load chat history from MongoDB when user logs in
  useEffect(() => {
    if (user) {
      fetchChatHistory();
    }
  }, [user]);

  const fetchChatHistory = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/chats?userId=${user.id}`);
      const data = await response.json();

      if (data.success && data.chats) {
        // Convert date strings back to Date objects
        const history = data.chats.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        setChatHistory(history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  // Remove the localStorage save effect - we'll save to MongoDB instead
  // useEffect(() => {
  //   if (user) {
  //     localStorage.setItem(`chatHistory_${user.id}`, JSON.stringify(chatHistory));
  //   }
  // }, [chatHistory, user]);

  // Fetch user's files when modal opens
  useEffect(() => {
    if (showFileModal && user) {
      fetchUserFiles();
    }
  }, [showFileModal, user]);

  const fetchUserFiles = async () => {
    if (!user) return;
    
    setIsLoadingFiles(true);
    try {
      const response = await fetch(`/api/files?userId=${user.id}`);
      const data = await response.json();
      
      if (data.success) {
        setUploadedFiles(data.files);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    // Check if there's a PDF in the uploaded files
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf');
    
    // If there's a PDF, set the first one as the attached PDF
    if (pdfFiles.length > 0 && !attachedPDF) {
      const pdfFile = pdfFiles[0];
      setAttachedPDF(pdfFile);
      const url = URL.createObjectURL(pdfFile);
      setPdfViewerURL(url);
    }

    // Convert FileList to base64 and upload to MongoDB
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        try {
          const response = await fetch('/api/files', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: user.id,
              name: file.name,
              size: file.size,
              type: file.type,
              url: base64String,
            }),
          });

          const data = await response.json();
          if (data.success) {
            // Refresh the files list
            fetchUserFiles();
          }
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      };
      
      reader.readAsDataURL(file);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    if (bytes < k) return bytes + ' Bytes';
    if (bytes < k * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const getTimeAgo = (date: string): string => {
    const now = new Date();
    const uploaded = new Date(date);
    const diffMs = now.getTime() - uploaded.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const handlePDFAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setAttachedPDF(file);
      // Create object URL for viewing
      const url = URL.createObjectURL(file);
      setPdfViewerURL(url);
    }
  };

  const handleRemovePDF = () => {
    if (pdfViewerURL) {
      URL.revokeObjectURL(pdfViewerURL);
    }
    setAttachedPDF(null);
    setPdfContent('');
    setPdfViewerURL('');
    setShowPDFViewer(false);
  };

  const handleViewPDF = () => {
    setShowPDFViewer(true);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (type === 'application/pdf') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;
    if (!user) return;

    // Add user message
    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };

    let newChatId = currentChatId;
    const newMessages = [...messages, userMessage];

    // Update UI immediately
    setMessages(newMessages);
    setInputValue("");
    setAttachedFiles([]);
    setSelectedFiles([]);

    try {
      // Update current chat or create new one in MongoDB
      if (currentChatId) {
        // Update existing chat
        const response = await fetch('/api/chats', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatId: currentChatId,
            messages: newMessages,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setChatHistory(prevHistory =>
            prevHistory.map(chat =>
              chat.id === currentChatId
                ? { ...chat, messages: newMessages, updatedAt: new Date() }
                : chat
            )
          );
        }
      } else {
        // Create new chat
        const title = userMessage.content.substring(0, 50) + (userMessage.content.length > 50 ? '...' : '');
        const response = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            title,
            messages: newMessages,
          }),
        });

        const data = await response.json();
        if (data.success && data.chat) {
          newChatId = data.chat.id;
          const newChat: Chat = {
            id: data.chat.id,
            title: data.chat.title,
            messages: newMessages,
            createdAt: new Date(data.chat.createdAt),
            updatedAt: new Date(data.chat.updatedAt),
          };
          setChatHistory(prev => [newChat, ...prev]);
          setCurrentChatId(newChatId);
        }
      }
    } catch (error) {
      console.error('Error saving chat:', error);
    }

    // Get AI response from Gemini
    setIsTyping(true);
    
    try {
      // Prepare form data for Gemini API
      const formData = new FormData();
      formData.append('prompt', userMessage.content);
      
      // Add conversation history
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role,
        text: msg.content
      }));
      formData.append('history', JSON.stringify(history));

      // Add PDF file if attached
      if (attachedPDF) {
        formData.append('file', attachedPDF);
      }

      // Add existing PDF content if we already have it
      if (pdfContent) {
        formData.append('pdfContent', pdfContent);
      }

      // Make streaming request to Gemini API
      const response = await fetch('/api/gemini', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            try {
              const data = JSON.parse(line);
              if (data.text) {
                aiResponse += data.text;
                
                // Update message in real-time as it streams
                const streamingMessage: Message = {
                  id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  role: "assistant",
                  content: aiResponse,
                  timestamp: new Date(),
                };

                setMessages([...newMessages, streamingMessage]);
              }
              
              // Save PDF content if returned
              if (data.pdfContent) {
                setPdfContent(data.pdfContent);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Create final assistant message
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: aiResponse || "I apologize, but I couldn't generate a response. Please try again.",
        timestamp: new Date(),
      };

      const updatedMessages = [...newMessages, assistantMessage];
      setMessages(updatedMessages);

      // Update chat history with assistant response in MongoDB
      try {
        const chatIdToUpdate = newChatId || currentChatId;
        if (chatIdToUpdate) {
          await fetch('/api/chats', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: chatIdToUpdate,
              messages: updatedMessages,
            }),
          });

          setChatHistory(prevHistory =>
            prevHistory.map(chat =>
              chat.id === chatIdToUpdate
                ? { ...chat, messages: updatedMessages, updatedAt: new Date() }
                : chat
            )
          );
        }
      } catch (error) {
        console.error('Error updating chat with assistant response:', error);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Show error message
      const errorMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: "assistant",
        content: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentChatId(null);
    setAttachedFiles([]);
    setSelectedFiles([]);
    setInputValue("");
    handleRemovePDF(); // Clear PDF attachment
  };

  const loadChat = (chatId: string) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
      setAttachedFiles([]);
      setSelectedFiles([]);
      setInputValue("");
      handleRemovePDF(); // Clear PDF attachment when switching chats
    }
  };

  const deleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the chat when clicking delete

    try {
      // Delete from MongoDB
      const response = await fetch(`/api/chats?chatId=${chatId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        // Update local state
        setChatHistory(prev => prev.filter(chat => chat.id !== chatId));

        // If we're deleting the current chat, start a new one
        if (currentChatId === chatId) {
          handleNewChat();
        }
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const getTimeAgoShort = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`${
          isSidebarCollapsed ? "w-20" : "w-80"
        } bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out`}
      >
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 pt-4">
          <div className="space-y-1">
            {/* New Chat */}
            <div 
              onClick={handleNewChat}
              className={`flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {!isSidebarCollapsed && <span className="font-medium text-sm">New Chat</span>}
            </div>

            {/* Files Section */}
            <div className={`flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {!isSidebarCollapsed && <span className="font-medium text-sm">Files</span>}
            </div>

            {/* Recent Chats */}
            {!isSidebarCollapsed && chatHistory.length > 0 && (
              <div className="mt-6">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recent Chats
                </div>
                <div className="space-y-0.5 mt-2">
                  {chatHistory.map((chat) => (
                    <div 
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-colors group ${
                        currentChatId === chat.id 
                          ? 'bg-gray-100 text-gray-900' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="truncate font-medium">{chat.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {getTimeAgoShort(chat.updatedAt)}
                        </span>
                        <button
                          onClick={(e) => deleteChat(chat.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                          title="Delete chat"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 hover:text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Static History (if no real history) */}
            {!isSidebarCollapsed && chatHistory.length === 0 && (
              <div className="mt-6">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recent
                </div>
                <div className="space-y-0.5 mt-2">
                  <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">Project ideas discussion</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">Help with code review</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-gray-200 p-4">
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
              {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.fullName || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            )}
            {!isSidebarCollapsed && (
              <button 
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors group"
                title="Logout"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Collapse Button */}
        <div className="border-t border-gray-200 p-2">
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors group"
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 text-gray-400 group-hover:text-gray-700 transition-transform ${isSidebarCollapsed ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
        {/* PDF Attachment Indicator - Top Right Corner */}
        {attachedPDF && (
          <div className="absolute top-4 right-4 z-10 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{attachedPDF.name}</p>
              <p className="text-xs text-gray-500">{(attachedPDF.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={handleViewPDF}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="View PDF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              onClick={handleRemovePDF}
              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove PDF"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="max-w-4xl w-full">
              {/* Title */}
              <header className="text-center mb-12">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gray-900">
                  What would you get done?
                </h1>
                <p className="text-gray-400 text-base md:text-lg">
                  Choose from select templates, or get creative with your own prompt
                </p>
              </header>

              {/* Input Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                {/* Attached Files Display */}
                {attachedFiles.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {attachedFiles.map((file) => (
                      <div 
                        key={file._id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                      >
                        {getFileIcon(file.type)}
                        <span className="text-gray-700 font-medium truncate max-w-[150px]">
                          {file.name}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatFileSize(file.size)}
                        </span>
                        <button
                          onClick={() => {
                            setAttachedFiles(prev => prev.filter(f => f._id !== file._id));
                            setSelectedFiles(prev => prev.filter(id => id !== file._id));
                          }}
                          className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="relative flex items-center gap-3">
                  <button 
                    onClick={() => setShowFileModal(true)}
                    className="flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                    title="Add files or PDFs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>

                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 h-12 p-3 border-none bg-transparent resize-none focus:outline-none text-gray-700 placeholder:text-gray-300"
                    placeholder="Describe what you want to write"
                  ></textarea>
                  <button 
                    onClick={handleSendMessage}
                    className="flex-shrink-0 bg-gray-900 text-white rounded-full w-12 h-12 flex items-center justify-center hover:bg-gray-800 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Conversation View */
          <>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-4 ${message.role === 'assistant' ? 'bg-gray-50' : ''} ${message.role === 'assistant' ? '-mx-4 px-4 py-6' : ''}`}>
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="text-sm font-semibold text-gray-900">
                        {message.role === 'user' ? (user?.fullName || 'You') : 'Zeejin'}
                      </div>
                      
                      {/* Attached Files */}
                      {message.attachedFiles && message.attachedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {message.attachedFiles.map((file) => (
                            <div 
                              key={file._id}
                              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            >
                              {getFileIcon(file.type)}
                              <span className="text-gray-700 font-medium truncate max-w-[150px]">
                                {file.name}
                              </span>
                              <span className="text-gray-400 text-xs">
                                {formatFileSize(file.size)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-gray-700 text-[15px] leading-7 max-w-full overflow-hidden break-words">
                        <MessageContent content={message.content} />
                      </div>
                      
                      {/* Message Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Copy">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        {message.role === 'assistant' && (
                          <>
                            <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Good response">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Bad response">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex gap-4 bg-gray-50 -mx-4 px-4 py-6">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="text-sm font-semibold text-gray-900 mb-2">Zeejin</div>
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Bar - Fixed at Bottom */}
            <div className="border-t border-gray-200 bg-white">
              <div className="max-w-3xl mx-auto px-4 py-4">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                  {/* Attached Files Display */}
                  {attachedFiles.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {attachedFiles.map((file) => (
                        <div 
                          key={file._id}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        >
                          {getFileIcon(file.type)}
                          <span className="text-gray-700 font-medium truncate max-w-[150px]">
                            {file.name}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {formatFileSize(file.size)}
                          </span>
                          <button
                            onClick={() => {
                              setAttachedFiles(prev => prev.filter(f => f._id !== file._id));
                              setSelectedFiles(prev => prev.filter(id => id !== file._id));
                            }}
                            className="ml-1 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setShowFileModal(true)}
                      className="flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
                      title="Add files or PDFs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>

                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="flex-1 max-h-32 p-2 border-none bg-transparent resize-none focus:outline-none text-gray-700 placeholder:text-gray-300"
                      placeholder="Reply to Zeejin..."
                      rows={1}
                    ></textarea>
                    <button 
                      onClick={handleSendMessage}
                      className="flex-shrink-0 bg-gray-900 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!inputValue.trim() && attachedFiles.length === 0}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* File Upload Modal */}
      {showFileModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Upload Files</h2>
              <button 
                onClick={() => setShowFileModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drag and Drop Area */}
            <div className="p-6 border-b border-gray-200">
              <label 
                htmlFor="file-input"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, DOC, DOCX, TXT, or images
                    <span className="block mt-1 text-red-600 font-medium">📄 PDFs will be attached for AI conversation</span>
                  </p>
                </div>
                <input 
                  id="file-input" 
                  type="file" 
                  className="hidden" 
                  multiple
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {/* Previously Uploaded Files */}
            <div className="flex-1 overflow-y-auto p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Previously Uploaded ({uploadedFiles.length})
              </h3>
              
              {isLoadingFiles ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">Loading files...</div>
                </div>
              ) : uploadedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-500 text-sm">No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div 
                      key={file._id}
                      onClick={() => toggleFileSelection(file._id)}
                      className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                        selectedFiles.includes(file._id)
                          ? 'border-gray-900 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {getTimeAgo(file.uploadedAt)}
                          {file.type === 'application/pdf' && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                              PDF Document
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        {selectedFiles.includes(file._id) ? (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <div className="h-6 w-6 rounded-full border-2 border-gray-300"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div>
                <p className="text-sm text-gray-600">
                  {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                </p>
                {uploadedFiles.some(file => selectedFiles.includes(file._id) && file.type === 'application/pdf') && (
                  <p className="text-xs text-red-600 mt-1">
                    📄 PDFs will be attached for conversation analysis
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFileModal(false)}
                  className="px-6 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    const filesToAttach = uploadedFiles.filter(file => selectedFiles.includes(file._id));
                    
                    // Separate PDFs from other files
                    const pdfFiles = filesToAttach.filter(file => file.type === 'application/pdf');
                    const otherFiles = filesToAttach.filter(file => file.type !== 'application/pdf');
                    
                    // If there's a PDF, set it as the attached PDF (only use the first one)
                    if (pdfFiles.length > 0) {
                      const pdfFile = pdfFiles[0];
                      try {
                        // Fetch the PDF file from the URL
                        const response = await fetch(pdfFile.url);
                        const blob = await response.blob();
                        const file = new File([blob], pdfFile.name, { type: 'application/pdf' });
                        
                        setAttachedPDF(file);
                        const url = URL.createObjectURL(file);
                        setPdfViewerURL(url);
                      } catch (error) {
                        console.error('Error loading PDF:', error);
                      }
                    }
                    
                    // Attach other files
                    setAttachedFiles(otherFiles);
                    setShowFileModal(false);
                    setSelectedFiles([]);
                  }}
                  className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Attach Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPDFViewer && pdfViewerURL && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-900">
                  {attachedPDF?.name || 'PDF Document'}
                </h2>
              </div>
              <button 
                onClick={() => setShowPDFViewer(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfViewerURL}
                className="w-full h-full"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
