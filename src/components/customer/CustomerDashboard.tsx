
import React from 'react';
import CustomerChatbot from '@/components/customer/CustomerChatbot';
import { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { handleSignOut } from '@/utils/authUtils';
import { 
  Star, 
  Gift, 
  ShoppingCart, 
  MessageSquare, 
  Bell, 
  CreditCard,
  Calendar,
  FileText,
  Settings,
  Award,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useCustomerData } from '@/hooks/useCustomerData';
import { CustomerCallSection } from './CustomerCallSection';

interface CustomerDashboardProps {
  user: User;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ user }) => {
  const { customerData, loading } = useCustomerData(user.id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW'
    }).format(amount);
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'silver':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'bronze':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTierBenefits = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum':
        return ['Free shipping on all orders', 'Priority customer support', '15% off all purchases', 'Exclusive early access'];
      case 'gold':
        return ['Free shipping over K500', 'Priority support', '10% off purchases', 'Monthly special offers'];
      case 'silver':
        return ['Free shipping over K300', '5% off purchases', 'Birthday discounts'];
      case 'bronze':
        return ['Points on every purchase', 'Member-only promotions'];
      default:
        return ['Sign up to start earning rewards'];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">
                Welcome back, {customerData?.name || user.email?.split('@')[0] || 'Customer'}!
              </h1>
              <p className="text-primary-foreground/80 mt-2">
                Here's what's happening with your account
              </p>
            </div>
            {customerData && (
              <div className="text-right">
                <Badge className={`mb-2 ${getTierColor(customerData.tier)}`}>
                  {customerData.tier} Member
                </Badge>
                <div className="text-2xl font-bold">{customerData.points} Points</div>
                <div className="text-sm text-primary-foreground/80">Available to redeem</div>
              </div>
            )}
          </div>
        </div>
        {/* Buttons positioned far to the top right */}
        <div className="absolute top-4 right-4 flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            View FAQs
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSignOut('/customer/auth')}
          >
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* AI Assistant */}
        <CustomerChatbot />

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customerData ? formatCurrency(customerData.total_spent) : 'K0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Lifetime purchases
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loyalty Points</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customerData?.points || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Points available
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Member Since</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {customerData ? new Date(customerData.join_date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                }) : 'New'}
              </div>
              <p className="text-xs text-muted-foreground">
                Joined our community
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Benefits */}
        {customerData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Your {customerData.tier} Benefits
                  </CardTitle>
                  <CardDescription>
                    Enjoy these exclusive perks as a {customerData.tier} member
                  </CardDescription>
                </div>
                <Badge className={getTierColor(customerData.tier)}>
                  {customerData.tier}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getTierBenefits(customerData.tier).map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Call Store Section */}
        <CustomerCallSection user={user} />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <ShoppingCart className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">My Orders</h3>
              <p className="text-sm text-muted-foreground">View order history and track deliveries</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Gift className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Redeem Points</h3>
              <p className="text-sm text-muted-foreground">Use your points for rewards and discounts</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Support</h3>
              <p className="text-sm text-muted-foreground">Get help or submit a complaint</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Settings className="h-8 w-8 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your account preferences</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest interactions with us</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity to show</p>
              <p className="text-sm mt-1">Your purchases and interactions will appear here</p>
            </div>
          </CardContent>
        </Card>
        
        {/* FAQs Section */}
        <div id="faqs" className="scroll-mt-24">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>Quick answers to common customer questions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>How do I track my order?</AccordionTrigger>
                  <AccordionContent>
                    You can view your order history and live delivery status under "My Orders" in the dashboard.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>What is your return policy?</AccordionTrigger>
                  <AccordionContent>
                    Most items can be returned within 7 days in original condition with receipt. See store policies below for details.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-3">
                  <AccordionTrigger>How do I redeem loyalty points?</AccordionTrigger>
                  <AccordionContent>
                    Go to "Redeem Points" to convert points into discounts at checkout. 100 points = K10 discount.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        {/* Store Policies (Examples) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Store Policies (Examples)
            </CardTitle>
            <CardDescription>These are placeholders — update to match your store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Returns & Exchanges:</span> Items may be returned within 7 days with proof of purchase. Excludes perishable and clearance items.
              </div>
              <div>
                <span className="font-medium">Warranty:</span> Electronics include a 6-month limited warranty against manufacturer defects.
              </div>
              <div>
                <span className="font-medium">Deliveries:</span> Standard delivery within 2–3 business days in major cities; remote areas may take longer.
              </div>
              <div>
                <span className="font-medium">Payments:</span> We accept VISA, Mastercard, mobile money, and cash on delivery (selected areas).
              </div>
              <div>
                <span className="font-medium">Privacy:</span> We only use your data to fulfill orders and personalize your experience. See full privacy policy on our website.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
