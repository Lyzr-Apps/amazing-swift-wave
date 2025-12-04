'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Plus, Trash2, Menu, X } from 'react-icons/fa'

interface Message {
  id: string
  type: 'user' | 'ai'
  content: string
  timestamp: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
}

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Get current conversation
  const currentConversation = conversations.find(c => c.id === currentConversationId)

  // Initialize with welcome message
  useEffect(() => {
    if (!currentConversationId && conversations.length === 0) {
      startNewChat()
    }
  }, [])

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        setTimeout(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight
        }, 0)
      }
    }
  }, [currentConversation?.messages])

  const startNewChat = () => {
    const newId = Date.now().toString()
    const welcomeMessage: Message = {
      id: 'welcome-' + newId,
      type: 'ai',
      content: 'Hello! I\'m your AI assistant. How can I help you today? Feel free to ask me questions, request information, or just chat about anything you\'d like.',
      timestamp: new Date().toISOString(),
    }

    const newConversation: Conversation = {
      id: newId,
      title: 'New Conversation',
      messages: [welcomeMessage],
      createdAt: new Date().toISOString(),
    }

    setConversations(prev => [newConversation, ...prev])
    setCurrentConversationId(newId)
  }

  const deleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id))
    if (currentConversationId === id) {
      const remaining = conversations.filter(c => c.id !== id)
      setCurrentConversationId(remaining.length > 0 ? remaining[0].id : null)
      if (remaining.length === 0) {
        startNewChat()
      }
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!messageInput.trim() || !currentConversation) return

    // Add user message
    const userMessageId = Date.now().toString()
    const userMessage: Message = {
      id: userMessageId,
      type: 'user',
      content: messageInput,
      timestamp: new Date().toISOString(),
    }

    setConversations(prev =>
      prev.map(conv =>
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              title: conv.title === 'New Conversation' ? messageInput.substring(0, 30) : conv.title,
            }
          : conv
      )
    )

    setMessageInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageInput,
          agent_id: '693152c28f91bb17ff415d58',
          conversation_history: currentConversation.messages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
          }))
        })
      })

      const result = await response.json()
      const aiResponseText = result.response || 'I apologize, but I encountered an issue processing your request. Please try again.'

      const aiMessageId = (Date.now() + 1).toString()
      const aiMessage: Message = {
        id: aiMessageId,
        type: 'ai',
        content: aiResponseText,
        timestamp: new Date().toISOString(),
      }

      setConversations(prev =>
        prev.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, aiMessage] }
            : conv
        )
      )
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        timestamp: new Date().toISOString(),
      }

      setConversations(prev =>
        prev.map(conv =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, errorMessage] }
            : conv
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 border-b border-gray-200">
          <Button
            onClick={startNewChat}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2"
            size="sm"
          >
            <Plus size={16} />
            New Chat
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`group p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? 'bg-blue-100 text-blue-900'
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
                onClick={() => setCurrentConversationId(conv.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      deleteConversation(conv.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">AI Chatbot</h1>
          <div className="w-8" />
        </div>

        {/* Chat Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-6 py-4">
          <div className="space-y-4 pb-4">
            {currentConversation?.messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl rounded-lg px-4 py-3 animate-in fade-in slide-in-from-bottom-2 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-gray-100 text-gray-900 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-lg rounded-bl-none px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Bar */}
        <div className="border-t border-gray-200 bg-white p-4">
          <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto">
            <Input
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 h-12 rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              autoFocus
            />
            <Button
              type="submit"
              disabled={isLoading || !messageInput.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white h-12 w-12 p-0 rounded-lg"
            >
              <Send size={20} />
            </Button>
          </form>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: slideInFromBottom 0.3s ease-out;
        }
        .delay-100 {
          animation-delay: 0.1s;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
      `}</style>
    </div>
  )
}
