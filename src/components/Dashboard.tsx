import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Users, Target, TrendingUp, DollarSign, Mail, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AddCustomerDialog from '@/components/AddCustomerDialog';

interface DashboardStats {
  totalCustomers: number;
  activePromotions: number;
  totalRevenue: number;
  todaysSales: number;
  monthlySales: number;
  avgEmailOpenRate: number;
}

interface RecentActivity {
  id: string;
  action: string;
  time: string;
  type: string;
}

interface DashboardProps {
  onNavigateToSection?: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigateToSection }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    activePromotions: 0,
    totalRevenue: 0,
    todaysSales: 0,
    monthlySales: 0,
    avgEmailOpenRate: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    // Real-time subscriptions for data updates including refunds
    let customersChannel: any;
    let promotionsChannel: any;  
    let emailCampaignsChannel: any;
    let salesChannel: any;
    let refundsChannel: any;

    const setupRealtimeListeners = async () => {
      // Customers subscription
      customersChannel = supabase
        .channel('customers-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => {
          fetchDashboardData();
        })
        .subscribe();

      // Promotions subscription
      promotionsChannel = supabase
        .channel('promotions-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'promotions' }, () => {
          fetchDashboardData();
        })
        .subscribe();

      // Email campaigns subscription
      emailCampaignsChannel = supabase
        .channel('email-campaigns-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'email_campaigns' }, () => {
          fetchDashboardData();
        })
        .subscribe();

      // Sales subscription
      salesChannel = supabase
        .channel('sales-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
          fetchDashboardData();
        })
        .subscribe();

      // Refunds subscription
      refundsChannel = supabase
        .channel('refunds-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'refunds' }, () => {
          fetchDashboardData();
        })
        .subscribe();
    };

    setupRealtimeListeners();

    // Listen for custom sales data change events
    const handleSalesDataChange = () => {
      fetchDashboardData();
    };

    window.addEventListener('salesDataChanged', handleSalesDataChange);

    return () => {
      if (customersChannel) supabase.removeChannel(customersChannel);
      if (promotionsChannel) supabase.removeChannel(promotionsChannel);
      if (emailCampaignsChannel) supabase.removeChannel(emailCampaignsChannel);
      if (salesChannel) supabase.removeChannel(salesChannel);
      if (refundsChannel) supabase.removeChannel(refundsChannel);
      window.removeEventListener('salesDataChanged', handleSalesDataChange);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch customers data
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('total_spent, created_at')
        .eq('user_id', user.id);

      if (customersError) throw customersError;

      // Fetch active promotions
      const { data: promotions, error: promotionsError } = await supabase
        .from('promotions')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (promotionsError) throw promotionsError;

      // Fetch email campaigns for open rate calculation
      const { data: emailCampaigns, error: emailError } = await supabase
        .from('email_campaigns')
        .select('opened, recipients')
        .eq('user_id', user.id);

      if (emailError) throw emailError;

      // Fetch sales data for revenue calculations including refund info
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('amount, created_at, sale_date, is_refunded, refunded_amount')
        .eq('store_user_id', user.id);

      if (salesError) throw salesError;

      // Fetch refunds data
      const { data: refundsData, error: refundsError } = await supabase
        .from('refunds')
        .select('refund_amount, created_at')
        .eq('store_user_id', user.id);

      if (refundsError) throw refundsError;

      // Fetch today's sales summary
      const today = new Date().toISOString().split('T')[0];
      const { data: todaysSummary } = await supabase
        .from('daily_sales_summary')
        .select('total_amount')
        .eq('store_user_id', user.id)
        .eq('sale_date', today)
        .single();

      // Fetch this month's sales summary
      const currentMonth = new Date();
      const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
      const { data: monthlySummary } = await supabase
        .from('daily_sales_summary')
        .select('total_amount')
        .eq('store_user_id', user.id)
        .gte('sale_date', firstDay);

      // Calculate stats with refunds accounted for
      const totalCustomers = customers?.length || 0;
      const activePromotions = promotions?.length || 0;
      
      // Calculate net revenue (sales minus refunds)
      const grossRevenue = salesData?.reduce((sum, sale) => sum + (Number(sale.amount) || 0), 0) || 0;
      const totalRefunds = refundsData?.reduce((sum, refund) => sum + (Number(refund.refund_amount) || 0), 0) || 0;
      const totalRevenue = grossRevenue - totalRefunds;
      
      const todaysSales = todaysSummary?.total_amount || 0;
      const monthlySales = monthlySummary?.reduce((sum, day) => sum + (Number(day.total_amount) || 0), 0) || 0;
      
      let avgEmailOpenRate = 0;
      if (emailCampaigns && emailCampaigns.length > 0) {
        const totalOpened = emailCampaigns.reduce((sum, campaign) => sum + (campaign.opened || 0), 0);
        const totalSent = emailCampaigns.reduce((sum, campaign) => sum + (campaign.recipients || 0), 0);
        avgEmailOpenRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
      }

      setStats({
        totalCustomers,
        activePromotions,
        totalRevenue,
        todaysSales,
        monthlySales,
        avgEmailOpenRate
      });

      // Generate recent activity from real data
      const activities: RecentActivity[] = [];
      
      // Add recent customers
      const recentCustomers = customers
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);
      
      recentCustomers?.forEach(customer => {
        const timeAgo = getTimeAgo(customer.created_at);
        activities.push({
          id: `customer-${customer.created_at}`,
          action: 'New customer registered',
          time: timeAgo,
          type: 'customer'
        });
      });

      // Add recent sales
      const recentSales = salesData
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);

      recentSales?.forEach(sale => {
        const timeAgo = getTimeAgo(sale.created_at);
        const amount = Number(sale.amount);
        activities.push({
          id: `sale-${sale.created_at}`,
          action: `Sale recorded: K${amount.toFixed(2)}`,
          time: timeAgo,
          type: 'sale'
        });
      });

      // Add recent promotions
      const { data: recentPromotions } = await supabase
        .from('promotions')
        .select('created_at, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(2);

      recentPromotions?.forEach(promotion => {
        const timeAgo = getTimeAgo(promotion.created_at);
        activities.push({
          id: `promotion-${promotion.created_at}`,
          action: `Promotion "${promotion.name}" created`,
          time: timeAgo,
          type: 'promotion'
        });
      });

      // Sort activities by time and limit to 5
      setRecentActivity(activities.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) > 1 ? 's' : ''} ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW'
    }).format(amount);
  };

  const dashboardStats = [
    {
      title: 'Total Customers',
      value: loading ? '...' : stats.totalCustomers.toLocaleString(),
      change: '+12%', // You could calculate this from historical data
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: <Users className="h-4 w-4" />
    },
    {
      title: "Today's Sales",
      value: loading ? '...' : formatCurrency(stats.todaysSales),
      change: 'Today', // You could calculate this from historical data
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      icon: <TrendingUp className="h-4 w-4" />
    },
    {
      title: 'Monthly Sales',
      value: loading ? '...' : formatCurrency(stats.monthlySales),
      change: 'This month', // You could calculate this from historical data
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      icon: <DollarSign className="h-4 w-4" />
    },
    {
      title: 'Total Revenue',
      value: loading ? '...' : formatCurrency(stats.totalRevenue),
      change: 'All time', // You could calculate this from historical data
      changeType: 'neutral' as 'positive' | 'negative' | 'neutral',
      icon: <BarChart3 className="h-4 w-4" />
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's what's happening with your CRM.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardStats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className={`text-xs ${
                stat.changeType === 'positive' ? 'text-green-600' : 
                stat.changeType === 'negative' ? 'text-red-600' : 
                'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Overview
            </CardTitle>
            <CardDescription>Monthly revenue for the past 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Chart will be implemented here</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates from your CRM</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg animate-pulse">
                    <div className="w-2 h-2 bg-muted rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <p>No recent activity</p>
                <p className="text-xs mt-1">Activity will appear here as you use your CRM</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Common tasks to get you started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => setAddCustomerDialogOpen(true)}
            >
              <Users className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Add Customer</h3>
              <p className="text-sm text-muted-foreground">Add a new customer to your database</p>
            </div>
            <div 
              className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onNavigateToSection?.('promotions')}
            >
              <Target className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Create Promotion</h3>
              <p className="text-sm text-muted-foreground">Set up a new promotional campaign</p>
            </div>
            <div 
              className="p-4 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onNavigateToSection?.('email')}
            >
              <Mail className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-medium">Send Email</h3>
              <p className="text-sm text-muted-foreground">Create and send an email campaign</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <AddCustomerDialog
        open={addCustomerDialogOpen}
        onOpenChange={setAddCustomerDialogOpen}
        onCustomerAdded={() => {
          fetchDashboardData();
          toast({
            title: "Success",
            description: "Customer added successfully",
          });
        }}
      />
    </div>
  );
};

export default Dashboard;
