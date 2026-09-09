import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Users, DollarSign, ShoppingCart, Calendar, Download, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SalesData {
  month: string;
  revenue: number;
  customers: number;
}

interface TopProduct {
  name: string;
  sales: number;
  revenue: number;
}

interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  avgSpend: number;
}

// Format currency as Zambian Kwacha
const formatZMW = (amount: number): string => {
  return `K${amount.toLocaleString('en-ZM', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
};

export const Reports: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportsData();
  }, []);

  const fetchReportsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch monthly revenue data from orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, created_at, customer_user_id')
        .eq('store_user_id', user.id)
        .order('created_at');

      // Fetch sales data (includes both registered and unregistered customer sales)
      const { data: sales } = await supabase
        .from('sales')
        .select('*')
        .eq('store_user_id', user.id)
        .order('sale_date');

      // Process monthly sales data - combine orders and sales
      const monthlyData = processMonthlyData(orders || [], sales || []);
      setSalesData(monthlyData);

      // Fetch top products from order items
      const { data: orderItems } = await supabase
        .from('order_items')
        .select(`
          product_name,
          quantity,
          total_price,
          orders!inner(store_user_id)
        `)
        .eq('orders.store_user_id', user.id);

      // Process top products
      const productsData = processTopProducts(orderItems || []);
      setTopProducts(productsData);

      // Fetch customer segments
      const { data: customers } = await supabase
        .from('customers')
        .select('tier, total_spent, customer_user_id')
        .eq('user_id', user.id);

      // Process customer segments - include unregistered customers from sales
      const segmentsData = processCustomerSegments(customers || [], sales || []);
      setCustomerSegments(segmentsData);

    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (orders: any[], sales: any[]): SalesData[] => {
    const monthlyRevenue: { [key: string]: { revenue: number; customers: Set<string> } } = {};
    
    // Process orders
    orders.forEach(order => {
      const date = new Date(order.created_at);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = { revenue: 0, customers: new Set() };
      }
      
      monthlyRevenue[monthKey].revenue += Number(order.total_amount);
      if (order.customer_user_id) {
        monthlyRevenue[monthKey].customers.add(order.customer_user_id);
      }
    });

    // Process sales data
    sales.forEach(sale => {
      const date = new Date(sale.sale_date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = { revenue: 0, customers: new Set() };
      }
      
      monthlyRevenue[monthKey].revenue += Number(sale.amount);
      // For registered customers use customer_user_id, for unregistered use customer_name
      if (sale.is_registered_customer && sale.customer_user_id) {
        monthlyRevenue[monthKey].customers.add(sale.customer_user_id);
      } else if (!sale.is_registered_customer && sale.customer_name) {
        monthlyRevenue[monthKey].customers.add(`unregistered_${sale.customer_name}`);
      }
    });

    // Get last 6 months
    const last6Months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
      last6Months.push({
        month: monthKey,
        revenue: monthlyRevenue[monthKey]?.revenue || 0,
        customers: monthlyRevenue[monthKey]?.customers.size || 0
      });
    }

    return last6Months;
  };

  const processTopProducts = (orderItems: any[]): TopProduct[] => {
    const productStats: { [key: string]: { sales: number; revenue: number } } = {};
    
    orderItems.forEach(item => {
      const name = item.product_name;
      if (!productStats[name]) {
        productStats[name] = { sales: 0, revenue: 0 };
      }
      productStats[name].sales += item.quantity;
      productStats[name].revenue += Number(item.total_price);
    });

    return Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const processCustomerSegments = (customers: any[], sales: any[]): CustomerSegment[] => {
    const segments: { [key: string]: { count: number; totalSpent: number } } = {
      'Platinum': { count: 0, totalSpent: 0 },
      'Gold': { count: 0, totalSpent: 0 },
      'Silver': { count: 0, totalSpent: 0 },
      'Bronze': { count: 0, totalSpent: 0 },
      'Walk-in Customer': { count: 0, totalSpent: 0 }
    };

    // Process registered customers
    customers.forEach(customer => {
      const tier = customer.tier || 'Bronze';
      if (segments[tier]) {
        segments[tier].count++;
        segments[tier].totalSpent += Number(customer.total_spent);
      }
    });

    // Process unregistered customers from sales data
    const unregisteredCustomers = new Map<string, number>();
    sales.forEach(sale => {
      if (!sale.is_registered_customer && sale.customer_name) {
        const currentSpent = unregisteredCustomers.get(sale.customer_name) || 0;
        unregisteredCustomers.set(sale.customer_name, currentSpent + Number(sale.amount));
      }
    });

    // Add unregistered customers to walk-in segment
    unregisteredCustomers.forEach((totalSpent, customerName) => {
      segments['Walk-in Customer'].count++;
      segments['Walk-in Customer'].totalSpent += totalSpent;
    });

    const totalCustomers = Object.values(segments).reduce((sum, seg) => sum + seg.count, 0);
    
    return Object.entries(segments)
      .filter(([_, data]) => data.count > 0)
      .map(([segment, data]) => ({
        segment: segment === 'Walk-in Customer' ? 'Walk-in Customers' : `${segment} Members`,
        count: data.count,
        percentage: totalCustomers > 0 ? Math.round((data.count / totalCustomers) * 100) : 0,
        avgSpend: data.count > 0 ? data.totalSpent / data.count : 0
      }))
      .sort((a, b) => b.count - a.count);
  };

  const currentMonthRevenue = salesData.length > 0 ? salesData[salesData.length - 1].revenue : 0;
  const previousMonthRevenue = salesData.length > 1 ? salesData[salesData.length - 2].revenue : 0;
  const revenueGrowth = previousMonthRevenue > 0 ? 
    ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100).toFixed(1) : '0';

  const totalCustomers = customerSegments.reduce((sum, segment) => sum + segment.count, 0);
  const avgOrderValue = salesData.length > 0 && salesData[salesData.length - 1].customers > 0 ? 
    currentMonthRevenue / salesData[salesData.length - 1].customers : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Business insights and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZMW(currentMonthRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              +{revenueGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Active customer base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZMW(avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{revenueGrowth}%</div>
            <p className="text-xs text-muted-foreground">Month over month</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
            <CardDescription>Revenue performance over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 pb-4">
              {salesData.map((data, index) => (
                <div key={data.month} className="flex flex-col items-center gap-2 flex-1">
                  <div 
                    className="bg-primary rounded-t w-full transition-all hover:bg-primary/80"
                    style={{ 
                      height: `${(data.revenue / Math.max(...salesData.map(d => d.revenue))) * 200}px`,
                      minHeight: '20px'
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{data.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Customer Segments */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Segments</CardTitle>
            <CardDescription>Customer distribution by membership tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customerSegments.map((segment, index) => (
                <div key={segment.segment} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        index === 0 ? 'bg-purple-500' :
                        index === 1 ? 'bg-yellow-500' :
                        index === 2 ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium">{segment.segment}</p>
                      <p className="text-sm text-muted-foreground">
                        {segment.count} customers • Avg: {formatZMW(segment.avgSpend)}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">{segment.percentage}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Products</CardTitle>
          <CardDescription>Best selling items by volume and revenue</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-muted-foreground">#{index + 1}</span>
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sales} units sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatZMW(product.revenue)}</p>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};