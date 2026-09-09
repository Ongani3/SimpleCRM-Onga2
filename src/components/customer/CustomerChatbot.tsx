import React, { useState, useRef } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const CustomerChatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm here to help. Ask me about your orders, appointments, promotions, or store policies.",
    },
  ]);
  const [input, setInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const faqResponses: { [key: string]: string } = {
    "order": "You can view your order history and track deliveries in the 'My Orders' section of your dashboard.",
    "appointment": "To schedule or view appointments, go to the 'Appointments' section in your dashboard.",
    "promotion": "Check the 'Promotions' section for current offers and discounts available to you.",
    "policies": "Our store policies include returns within 7 days, warranty on electronics, and delivery within 2-3 business days. For full details, visit our store policies page.",
    "policy": "Our store policies include returns within 7 days, warranty on electronics, and delivery within 2-3 business days. For full details, visit our store policies page.",
    "points": "You can redeem loyalty points for discounts. 100 points = K10 off your next purchase.",
    "return": "Items can be returned within 7 days with proof of purchase. Excludes perishable and clearance items.",
    "delivery": "Standard delivery takes 2-3 business days in major cities. Remote areas may take longer.",
    "payment": "We accept VISA, Mastercard, mobile money, and cash on delivery in selected areas.",
    "warranty": "Electronics include a 6-month limited warranty against manufacturer defects.",
    "privacy": "We only use your data to fulfill orders and personalize your experience. See our full privacy policy.",
    "help": "I'm here to help! Ask me about orders, appointments, promotions, policies, or any other questions.",
    "support": "For additional support, you can contact us via email or schedule a callback.",
    "working hours": " We're open Monday-Saturday 9AM-6PM. Visit us for in-person assistance!",
    "hours": "We're open Monday-Saturday from 9AM to 6PM. Closed on Sundays and public holidays.",
    "location": "Our main store is located at 49 Lufubu Rd, Kalundu, Lusaka. We also have pickup points throughout the city.",
    "contact": "You can reach us by phone at +260 970 621 764, email at support@store.com, or visit our store.",
    "refund": "Refunds are processed within 3-5 business days after receiving returned items. You'll receive an email confirmation.",
    "exchange": "Exchanges are available within 7 days. Bring your receipt and the item in original condition.",
    "shipping": "Shipping costs vary by location and order value. Free shipping on orders over K500.",
    "tracking": "Track your order using the tracking number sent to your email. Updates are available in your dashboard.",
  };

  const getResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();
    for (const [key, response] of Object.entries(faqResponses)) {
      if (lowerQuestion.includes(key)) {
        return response;
      }
    }
    return "I'm sorry, I don't have information on that topic. Please contact support for more help.";
  };

  const onSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Get response based on keywords
    const response = getResponse(trimmed);
    const botMsg: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: response };
    setMessages((prev) => [...prev, botMsg]);

    // Scroll to bottom
    queueMicrotask(() => containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" }));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Customer Support Chatbot</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={containerRef} className="h-64 overflow-auto space-y-3 pr-2">
          {messages.map((m) => (
            <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
              <div className={`inline-block rounded px-3 py-2 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about orders, appointments, promotions..."
        />
        <Button onClick={onSend}>Send</Button>
      </CardFooter>
    </Card>
  );
};

export default CustomerChatbot;


