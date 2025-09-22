import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MessageCircle, Send, Search, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface User {
  id: string;
  email: string;
  role: string;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  bookingId?: string;
  senderName?: string;
  receiverName?: string;
}

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
}

export default function Inbox() {
  const [, setLocation] = useLocation();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    try {
      // Check authentication
      const authResponse = await fetch('/api/auth/me', {
        credentials: 'include',
      });
      
      if (!authResponse.ok) {
        setLocation('/');
        return;
      }

      const authData = await authResponse.json();
      setCurrentUser(authData.user);

      // Load conversations
      const conversationsResponse = await fetch('/api/messages/conversations', {
        credentials: 'include',
      });

      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        setConversations(conversationsData.conversations || []);
      }
    } catch (error) {
      console.error('Error loading inbox:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversation = async (conversation: Conversation) => {
    if (selectedConversation?.userId === conversation.userId) {
      return; // Already loaded
    }

    setIsLoadingMessages(true);
    setSelectedConversation(conversation);

    try {
      const response = await fetch(`/api/messages/conversation/${conversation.userId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        
        // Mark messages as read
        await markMessagesAsRead(conversation.userId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const markMessagesAsRead = async (userId: string) => {
    try {
      await fetch(`/api/messages/mark-read/${userId}`, {
        method: 'POST',
        credentials: 'include',
      });

      // Update conversations to reflect read status
      setConversations(prev => 
        prev.map(conv => 
          conv.userId === userId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || isSending) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          receiverId: selectedConversation.userId,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the new message to the current conversation
        setMessages(prev => [...prev, data.message]);
        
        // Update the conversation preview
        setConversations(prev => 
          prev.map(conv => 
            conv.userId === selectedConversation.userId
              ? { 
                  ...conv, 
                  lastMessage: newMessage.trim(),
                  lastMessageTime: new Date().toISOString(),
                }
              : conv
          )
        );
        
        setNewMessage("");
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getFilteredConversations = () => {
    if (!searchTerm.trim()) {
      return conversations;
    }
    
    const term = searchTerm.toLowerCase();
    return conversations.filter(conv => 
      conv.userName.toLowerCase().includes(term)
    );
  };

  const getUserInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-pulse">Loading inbox...</div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const filteredConversations = getFilteredConversations();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/profile">
          <Button variant="outline" size="sm" data-testid="button-back-to-profile">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Inbox
          </h1>
          <p className="text-muted-foreground">
            Messages from your {currentUser.role === 'coach' ? 'students' : 'coaches'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="space-y-4 lg:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Messages
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-140px)] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversations yet</p>
                  <p className="text-sm text-muted-foreground">
                    Messages will appear here when you receive them
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredConversations.map((conversation) => (
                    <div
                      key={conversation.userId}
                      onClick={() => loadConversation(conversation)}
                      className={`
                        p-4 border-b cursor-pointer hover-elevate
                        ${selectedConversation?.userId === conversation.userId 
                          ? 'bg-muted' 
                          : ''
                        }
                      `}
                      data-testid={`conversation-${conversation.userId}`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="text-sm">
                            {getUserInitials(conversation.userName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate">
                              {conversation.userName}
                            </p>
                            <div className="flex items-center gap-2">
                              {conversation.unreadCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {formatMessageTime(conversation.lastMessageTime)}
                              </span>
                            </div>
                          </div>
                          <p className={`
                            text-sm truncate
                            ${conversation.unreadCount > 0 
                              ? 'text-foreground font-medium' 
                              : 'text-muted-foreground'
                            }
                          `}>
                            {conversation.lastMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Messages Panel */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {getUserInitials(selectedConversation.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {selectedConversation.userName}
                      </CardTitle>
                      <CardDescription>
                        {currentUser.role === 'coach' ? 'Student' : 'Coach'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col p-0">
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoadingMessages ? (
                      <div className="text-center py-8">
                        <div className="animate-pulse">Loading messages...</div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No messages yet</p>
                        <p className="text-sm text-muted-foreground">
                          Start the conversation below
                        </p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`
                            flex gap-3
                            ${message.senderId === currentUser.id 
                              ? 'justify-end' 
                              : 'justify-start'
                            }
                          `}
                        >
                          <div
                            className={`
                              max-w-xs lg:max-w-md px-4 py-2 rounded-lg
                              ${message.senderId === currentUser.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                              }
                            `}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`
                              text-xs mt-1
                              ${message.senderId === currentUser.id
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                              }
                            `}>
                              {formatMessageTime(message.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Separator />

                  {/* Message Input */}
                  <div className="p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="resize-none min-h-[40px] max-h-[120px]"
                        rows={1}
                        data-testid="textarea-new-message"
                      />
                      <Button 
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || isSending}
                        className="px-3"
                        data-testid="button-send-message"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Select a conversation to view messages</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}