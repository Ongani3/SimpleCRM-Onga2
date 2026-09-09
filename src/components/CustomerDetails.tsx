import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, ShoppingBag, Star, TrendingUp, Package, CreditCard, Edit, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: string;
  status: string;
  points: number;
  total_spent: number;
  last_visit: string | null;
  join_date: string;
  favorite_products: string[] | null;
}

interface Order {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: number;
  status: string;
}

const CustomerDetails = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomerData();
  }, [customerId]);

  const fetchCustomerData = async () => {
    if (!customerId) return;

    try {
      setLoading(true);
      
      // Fetch customer data
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single();

      if (customerError) {
        console.error('Error fetching customer:', customerError);
        toast({
          title: "Error",
          description: "Failed to load customer data",
          variant: "destructive"
        });
        return;
      }

      setCustomer(customerData);
      setEditingCustomer(customerData);

      // Fetch customer orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('id, order_number, created_at, total_amount, status')
        .eq('customer_user_id', customerData.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ordersError) {
        console.error('Error fetching orders:', ordersError);
      } else {
        setOrders(ordersData || []);
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load customer data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editingCustomer.name,
          email: editingCustomer.email,
          phone: editingCustomer.phone,
          tier: editingCustomer.tier,
          status: editingCustomer.status,
          points: editingCustomer.points,
          total_spent: editingCustomer.total_spent
        })
        .eq('id', editingCustomer.id);

      if (error) {
        console.error('Error updating customer:', error);
        toast({
          title: "Error",
          description: "Failed to update customer",
          variant: "destructive"
        });
        return;
      }

      setCustomer(editingCustomer);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Customer updated successfully"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingCustomer(customer);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">Loading...</div>;
  }

  if (!customer) {
    return <div className="min-h-screen bg-background p-6 flex items-center justify-center">Customer not found</div>;
  }

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? orders.reduce((sum, order) => sum + order.total_amount, 0) / totalOrders : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/?section=customers")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
          
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleSaveCustomer}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Customer
              </Button>
            )}
          </div>
        </div>

        {/* Customer Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Info Card */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg font-semibold">
                    {(isEditing ? editingCustomer?.name : customer.name)?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={editingCustomer?.name || ''}
                      onChange={(e) => setEditingCustomer(prev => prev ? {...prev, name: e.target.value} : null)}
                      className="text-xl font-semibold mb-2"
                    />
                  ) : (
                    <CardTitle className="text-xl">{customer.name}</CardTitle>
                  )}
                  <div className="flex gap-2 mt-2">
                    {isEditing ? (
                      <Select
                        value={editingCustomer?.tier || customer.tier}
                        onValueChange={(value) => setEditingCustomer(prev => prev ? {...prev, tier: value} : null)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bronze">Bronze</SelectItem>
                          <SelectItem value="Silver">Silver</SelectItem>
                          <SelectItem value="Gold">Gold</SelectItem>
                          <SelectItem value="Platinum">Platinum</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary">{customer.tier}</Badge>
                    )}
                    
                    {isEditing ? (
                      <Select
                        value={editingCustomer?.status || customer.status}
                        onValueChange={(value) => setEditingCustomer(prev => prev ? {...prev, status: value} : null)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={customer.status === 'active' ? 'default' : 'destructive'}>
                        {customer.status}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4" />
                {isEditing ? (
                  <Input
                    type="email"
                    value={editingCustomer?.email || ''}
                    onChange={(e) => setEditingCustomer(prev => prev ? {...prev, email: e.target.value} : null)}
                    className="text-sm"
                  />
                ) : (
                  <span className="text-sm">{customer.email}</span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4" />
                {isEditing ? (
                  <Input
                    value={editingCustomer?.phone || ''}
                    onChange={(e) => setEditingCustomer(prev => prev ? {...prev, phone: e.target.value} : null)}
                    className="text-sm"
                  />
                ) : (
                  <span className="text-sm">{customer.phone}</span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Joined {new Date(customer.join_date).toLocaleDateString()}</span>
              </div>
              
              <div className="flex items-center gap-3 text-muted-foreground">
                <Star className="w-4 h-4" />
                {isEditing ? (
                  <Input
                    type="number"
                    value={editingCustomer?.points || 0}
                    onChange={(e) => setEditingCustomer(prev => prev ? {...prev, points: parseInt(e.target.value) || 0} : null)}
                    className="text-sm"
                  />
                ) : (
                  <span className="text-sm">{customer.points.toLocaleString()} loyalty points</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <div className="flex-1">
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={editingCustomer?.total_spent || 0}
                        onChange={(e) => setEditingCustomer(prev => prev ? {...prev, total_spent: parseFloat(e.target.value) || 0} : null)}
                        className="text-2xl font-bold mb-1"
                      />
                    ) : (
                      <p className="text-2xl font-bold">K{customer.total_spent.toFixed(2)}</p>
                    )}
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalOrders}</p>
                    <p className="text-sm text-muted-foreground">Total Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">K{averageOrderValue.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">Avg Order Value</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Information */}
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">Recent Orders</TabsTrigger>
            <TabsTrigger value="products">Favorite Products</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono">{order.order_number}</TableCell>
                          <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="font-mono">K{order.total_amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{order.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No orders found</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Favorite Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {customer.favorite_products && customer.favorite_products.length > 0 ? (
                    customer.favorite_products.map((product, index) => (
                      <Badge key={index} variant="secondary" className="justify-center p-2">
                        <Package className="w-4 h-4 mr-2" />
                        {product}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4 col-span-full">No favorite products</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orders.length > 0 ? (
                    orders.slice(0, 3).map((order) => (
                      <div key={order.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">Placed order {order.order_number}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CustomerDetails;