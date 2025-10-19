"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Card from "@/components/Card";
import { MessageIcon } from "@/components/icons/MessageIcon";
import { ResearchIcon } from "@/components/icons/ResearchIcon";
import { BlogPostIcon } from "@/components/icons/BlogPostIcon";
import { PresentationIcon } from "@/components/icons/PresentationIcon";
import { TweetIcon } from "@/components/icons/TweetIcon";
import { ProductFeedbackIcon } from "@/components/icons/ProductFeedbackIcon";
import { BusinessReportIcon } from "@/components/icons/BusinessReportIcon";
import { EngagingBlogContentIcon } from "@/components/icons/EngagingBlogContentIcon";
import { NotificationsIcon } from "@/components/icons/NotificationsIcon";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  attachedFiles?: File[];
}

export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  const openAuthModal = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setError("");
    setFormData({ fullName: "", email: "", password: "" });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setSelectedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType === 'application/pdf') {
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

  const handleSendMessage = () => {
    if (!inputValue.trim() && selectedFiles.length === 0) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
      attachedFiles: selectedFiles.length > 0 ? [...selectedFiles] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let result;
      
      if (authMode === "signin") {
        result = await signIn(formData.email, formData.password);
      } else {
        if (!formData.fullName) {
          setError("Please enter your full name");
          setLoading(false);
          return;
        }
        result = await signUp(formData.fullName, formData.email, formData.password);
      }

      if (result.success) {
        setShowAuthModal(false);
        router.push("/dashboard");
      } else {
        setError(result.message || "Authentication failed. Please try again.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
      {/* Auth Buttons */}
      <div className="absolute top-8 right-8 flex items-center gap-4">
        <button 
          onClick={() => openAuthModal("signin")}
          className="flex items-center gap-2 px-6 py-3 text-base font-medium text-gray-700 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Sign In
        </button>
        <button 
          onClick={() => openAuthModal("signup")}
          className="flex items-center gap-2 px-6 py-3 text-base font-medium text-white bg-gradient-to-br from-pink-300 via-purple-300 to-purple-400 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Sign Up
        </button>
      </div>

      <div className="container mx-auto px-4 py-12 min-h-screen flex flex-col">
        {messages.length === 0 ? (
          /* Welcome Screen */
          <>
            <header className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gray-900">
                What would you get done?
              </h1>
              <p className="text-gray-400 text-base md:text-lg">
                Choose from select templates, or get creative with your own prompt
              </p>
            </header>

            <main className="max-w-4xl mx-auto w-full">
              {/* Input Section */}
              <div className="bg-white p-8 rounded-2xl shadow-sm mb-16">
                {/* Selected Files Display */}
                {selectedFiles.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {selectedFiles.map((file, index) => (
                      <div 
                        key={index}
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
                          onClick={() => removeFile(index)}
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
                  <label htmlFor="file-upload" className="flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      multiple
                      onChange={handleFileSelect}
                    />
                  </label>
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 h-12 p-3 border-none bg-transparent resize-none focus:outline-none text-gray-700 placeholder:text-gray-300"
                    placeholder="Describe what you want to write"
                  ></textarea>
                  <button 
                    onClick={handleSendMessage}
                    className="flex-shrink-0 bg-gradient-to-br from-pink-300 via-purple-300 to-purple-400 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </button>
                </div>
              </div>
            </main>
          </>
        ) : (
          /* Conversation View */
          <>
            <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
              {/* Messages Container */}
              <div className="flex-1 overflow-y-auto space-y-6 mb-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex gap-4 ${message.role === 'assistant' ? 'bg-gray-50 -mx-4 px-4 py-6 rounded-lg' : ''}`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {message.role === 'user' ? (
                      <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        U
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
                        {message.role === 'user' ? 'You' : 'Zeejin'}
                      </div>
                      
                      {/* Attached Files */}
                    {message.attachedFiles && message.attachedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {message.attachedFiles.map((file, index) => (
                          <div 
                            key={index}
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
                <div className="flex gap-4 bg-gray-50 -mx-4 px-4 py-6 rounded-lg">
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
            </div>

            {/* Input Bar - Fixed at Bottom */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
              {/* Selected Files Display */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div 
                      key={index}
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
                        onClick={() => removeFile(index)}
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
                <label htmlFor="file-upload-chat" className="flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <input 
                    id="file-upload-chat" 
                    type="file" 
                    className="hidden" 
                    multiple
                    onChange={handleFileSelect}
                  />
                </label>
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
                  className="flex-shrink-0 bg-gradient-to-br from-pink-300 via-purple-300 to-purple-400 text-white rounded-full w-10 h-10 flex items-center justify-center hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!inputValue.trim() && selectedFiles.length === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </div>
            </div>
          </main>
          </>
        )}
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
            {/* Close Button */}
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Header */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {authMode === "signin" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-gray-500 mb-6">
              {authMode === "signin" 
                ? "Sign in to continue to your account" 
                : "Sign up to get started"}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {authMode === "signup" && (
                <div>
                  <label htmlFor="fullname" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullname"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                    placeholder="John Doe"
                    required={authMode === "signup"}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>

              {authMode === "signin" && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <a href="#" className="text-purple-400 hover:text-purple-500">
                    Forgot password?
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-base font-medium text-white bg-gradient-to-br from-pink-300 via-purple-300 to-purple-400 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : (authMode === "signin" ? "Sign In" : "Sign Up")}
              </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center text-sm text-gray-600">
              {authMode === "signin" ? (
                <p>
                  Don't have an account?{" "}
                  <button 
                    onClick={() => setAuthMode("signup")}
                    className="text-purple-400 hover:text-purple-500 font-medium"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button 
                    onClick={() => setAuthMode("signin")}
                    className="text-purple-400 hover:text-purple-500 font-medium"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
