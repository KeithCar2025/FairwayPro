import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from "@/components/ui/card";
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
  sender_id: string;
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  coach_id: string;
  coach_name?: string;
  coach_email?: string;
  student_id: string;
  student_name?: string;
  student_email?: string;
  last_message: string;
  last_message_time: string;
  unread_count?: number;
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
      // Auth check
      const authResponse = await fetch("/api/auth/me", { credentials: "include" });
      if (!authResponse.ok) {
        setLocation("/");
        return;
      }
      const authData = await authResponse.json();
      setCurrentUser(authData.user);

      // Load conversations
      const convResponse = await fetch("/api/messages/conversations", { credentials: "include" });
      if (convResponse.ok) {
        const data = await convResponse.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Error loading inbox:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConversation = async (conversation: Conversation) => {
    if (selectedConversation?.id === conversation.id) return;

    setSelectedConversation(conversation);
    setIsLoadingMessages(true);

    try {
      const response = await fetch(`/api/messages/${conversation.id}`, { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setMessages(data || []);
        // Mark messages as read
        await fetch(`/api/messages/mark-read/${conversation.id}`, {
          method: "POST",
          credentials: "include",
        });

        // Update unread count locally
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conversation.id ? { ...c, unread_count: 0 } : c
          )
        );
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim() || isSending) return;

    setIsSending(true);

    try {
      const res = await fetch("/api/messages/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        // Append the new message locally
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender_id: currentUser!.id,
            content: newMessage.trim(),
            created_at: new Date().toISOString(),
          },
        ]);

        // Update conversation preview locally
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? { ...c, last_message: newMessage.trim(), last_message_time: new Date().toISOString() }
              : c
          )
        );

        setNewMessage("");
      } else {
        const data = await res.json();
        console.error("Failed to send message:", data.error);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: string) => {
    const date = new Date(ts);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (diffHours < 24 * 7) return date.toLocaleDateString([], { weekday: "short" });
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const filteredConversations = searchTerm
    ? conversations.filter((c) => {
        const name =
          currentUser?.role === "coach"
            ? c.student_name || c.student_email || c.student_id
            : c.coach_name || c.coach_email || c.coach_id;
        return name.toLowerCase().includes(searchTerm.toLowerCase());
      })
    : conversations;

  const getUserInitials = (name: string) => name.slice(0, 2).toUpperCase();

  if (isLoading) return <div className="text-center py-8">Loading inbox...</div>;
  if (!currentUser) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/profile">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          <p className="text-muted-foreground">
            Messages from your {currentUser.role === "coach" ? "students" : "coaches"}
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
                Conversations
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-140px)] overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const name = currentUser.role === "coach"
                    ? conv.student_name || conv.student_email || conv.student_id
                    : conv.coach_name || conv.coach_email || conv.coach_id;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv)}
                      className={`p-4 border-b cursor-pointer hover:bg-muted/40 transition ${
                        selectedConversation?.id === conv.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            {getUserInitials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium truncate">{name}</p>
                            {conv.unread_count && conv.unread_count > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm truncate text-muted-foreground">{conv.last_message}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
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
                        {getUserInitials(
                          currentUser.role === "coach"
                            ? selectedConversation.student_name || selectedConversation.student_email || selectedConversation.student_id
                            : selectedConversation.coach_name || selectedConversation.coach_email || selectedConversation.coach_id
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">
                        {currentUser.role === "coach"
                          ? selectedConversation.student_name || selectedConversation.student_email || selectedConversation.student_id
                          : selectedConversation.coach_name || selectedConversation.coach_email || selectedConversation.coach_id}
                      </CardTitle>
                      <CardDescription>
                        {currentUser.role === "coach" ? "Student" : "Coach"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {isLoadingMessages ? (
                      <div className="text-center py-8">Loading messages...</div>
                    ) : messages.length === 0 ? (
                      <div className="text-center py-8">No messages yet</div>
                    ) : (
                      messages.map((msg) => {
                        const isMine = msg.sender_id === currentUser.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`relative max-w-xs lg:max-w-md px-4 py-2 rounded-xl shadow
                                ${isMine
                                  ? "bg-primary text-primary-foreground ml-auto"
                                  : "bg-muted text-foreground mr-auto"
                                }`}
                              style={{
                                borderRadius: isMine
                                  ? "20px 20px 6px 20px"
                                  : "20px 20px 20px 6px",
                              }}
                            >
                              <p className="text-sm break-words">{msg.content}</p>
                              <p className="text-xs mt-1 text-muted-foreground/70 text-right">
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <Separator />

                  <div className="p-4">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        className="resize-none min-h-[40px] max-h-[120px]"
                        rows={1}
                      />
                      <Button onClick={sendMessage} disabled={!newMessage.trim() || isSending}>
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
              <CardContent className="flex-1 flex items-center justify-center text-center">
                <MessageCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a conversation to view messages</p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}