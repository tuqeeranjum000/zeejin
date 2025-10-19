"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

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

    // Convert FileList to base64 and upload to MongoDB
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        try {
          const response = await fetch('/api/files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              name: file.name,
              size: file.size,
              type: file.type.split('/')[1] || 'file',
              url: base64String, // In production, upload to cloud storage
            }),
          });

          const data = await response.json();
          
          if (data.success) {
            // Refresh the file list
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
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
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

  const getFileIcon = (type: string) => {
    if (type === 'pdf') {
      return (
        <svg className="h-10 w-10 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h10l4 4v16H2v-1z"/>
        </svg>
      );
    } else if (type === 'doc' || type === 'docx') {
      return (
        <svg className="h-10 w-10 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h10l4 4v16H2v-1z"/>
        </svg>
      );
    }
    return (
      <svg className="h-10 w-10 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 18h12V6h-4V2H4v16zm-2 1V0h10l4 4v16H2v-1z"/>
      </svg>
    );
  };

  const handleSendMessage = () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setAttachedFiles([]);
    setSelectedFiles([]);

    // Simulate AI response
    setIsTyping(true);
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I'll help you with that! You said: "${userMessage.content}". This is a simulated response. In a real implementation, this would connect to an AI service.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-80'} bg-white border-r border-gray-200 flex flex-col transition-all duration-300`}>
        {/* Header - New Chat */}
        <div className="p-4">
          <button className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {!isSidebarCollapsed && <span className="font-medium text-sm">New Chat</span>}
          </button>
        </div>

        {/* Search Bar */}
        {!isSidebarCollapsed && (
          <div className="px-4 pb-4">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                className="w-full pl-9 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm text-gray-700 placeholder:text-gray-400"
              />
              <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-1.5 py-0.5 text-xs font-medium text-gray-500 bg-white border border-gray-200 rounded shadow-sm">
                ⌘F
              </kbd>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-4">
          <div className="space-y-1">
            {/* History Section */}
            <div className={`flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {!isSidebarCollapsed && <span className="font-medium text-sm">History</span>}
            </div>

            {/* Files Section */}
            <div className={`flex items-center gap-3 px-3 py-2.5 text-gray-700 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 group-hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              {!isSidebarCollapsed && <span className="font-medium text-sm">Files</span>}
            </div>

            {/* All History */}
            {!isSidebarCollapsed && (
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
                  <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">Planning next week tasks</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">Database schema design</span>
                  </div>
                  <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors group">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="truncate">API integration help</span>
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
      <main className="flex-1 flex flex-col bg-white overflow-hidden">
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
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
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
                        {message.role === 'user' ? (user?.fullName || 'You') : 'Copyzen'}
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
                      
                      <div className="text-gray-700 text-[15px] leading-7 whitespace-pre-wrap">
                        {message.content}
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
                      <div className="text-sm font-semibold text-gray-900 mb-2">Copyzen</div>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
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
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <textarea
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 max-h-32 p-2 border-none bg-transparent resize-none focus:outline-none text-gray-700 placeholder:text-gray-300"
                      placeholder="Reply to Copyzen..."
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
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowFileModal(true)}
                className="flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1 max-h-32 p-2 border-none bg-transparent resize-none focus:outline-none text-gray-700 placeholder:text-gray-300"
                placeholder="Reply to Copyzen..."
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

            {/* Upload Area */}
            <div className="p-6 border-b border-gray-200">
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-gray-600">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PDF, DOC, PNG, JPG up to 10MB</p>
                </div>
                <input 
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
              <p className="text-sm text-gray-600">
                {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowFileModal(false)}
                  className="px-6 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    // Add selected files to attached files
                    const filesToAttach = uploadedFiles.filter(file => selectedFiles.includes(file._id));
                    setAttachedFiles(filesToAttach);
                    setShowFileModal(false);
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
    </div>
  );
}
