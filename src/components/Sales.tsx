import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { CalendarDays, DollarSign, Plus, User, Users, Search, History } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './ui/use-toast';
import SalesHistory from './SalesHistory';

interface Sale {
  id: string;
  amount: number;
  customer_name: string | null;
  customer_phone: string | null;
  is_registered_customer: boolean;
  payment_method: string;
  description: string | null;
  sale_date: string;
  created_at: string;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: string;
  customer_user_id: string | null;
}

interface DailySummary {
  sale_date: string;
  total_amount: number;
  registered_customer_sales: number;
  unregistered_customer_sales: number;
  transaction_count: number;
}

const formatZMW = (amount: number): string => {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount).replace('ZMW', 'K');
};

const Sales = () => {
  const [entryMode, setEntryMode] = useState<'individual' | 'daily_total'>('individual');
  const [amount, setAmount] = useState('');
  const [customerType, setCustomerType] = useState<'registered' | 'unregistered'>('unregistered');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [description, setDescription] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [todaySummary, setTodaySummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecentSales();
    fetchTodaySummary();

    // Realtime updates: refresh summary and recent sales on any sales/summary change
    const channel = supabase
      .channel('sales-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_sales_summary' },
        () => {
          fetchTodaySummary();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchRecentSales();
          fetchTodaySummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (customerType === 'registered' && customerSearch.length > 1) {
      const debounce = setTimeout(() => {
        searchCustomers(customerSearch);
      }, 300);
      
      return () => clearTimeout(debounce);
    } else if (customerType === 'registered' && customerSearch.length === 0) {
      // Load recent customers when search is empty
      loadRecentCustomers();
    }
  }, [customerSearch, customerType]);

  const loadRecentCustomers = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading recent customers:', error);
    }
  };

  const fetchRecentSales = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('store_user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentSales(data || []);
    } catch (error) {
      console.error('Error fetching recent sales:', error);
    }
  };

  const fetchTodaySummary = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_sales_summary')
        .select('*')
        .eq('store_user_id', user.user.id)
        .eq('sale_date', today)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setTodaySummary(data);
    } catch (error) {
      console.error('Error fetching today\'s summary:', error);
    }
  };

  const searchCustomers = async (query: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('user_id', user.user.id)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
        .limit(5);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (customerType === 'unregistered' && !customerName.trim()) {
      toast({
        title: "Customer Name Required",
        description: "Please enter a customer name for unregistered customers",
        variant: "destructive",
      });
      return;
    }

    if (customerType === 'registered' && !selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a registered customer",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const saleData = {
        store_user_id: user.user.id,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        transaction_type: entryMode === 'individual' ? 'individual_sale' : 'daily_total',
        is_registered_customer: customerType === 'registered',
        customer_user_id: customerType === 'registered' ? selectedCustomer?.customer_user_id : null,
        customer_name: customerType === 'unregistered' ? customerName : (selectedCustomer?.name || null),
        customer_phone: customerType === 'unregistered' && customerPhone ? customerPhone : (selectedCustomer?.phone || null),
        description: description || null,
        sale_date: saleDate,
      };

      const { error } = await supabase
        .from('sales')
        .insert([saleData]);

      if (error) throw error;

      toast({
        title: "Sale Recorded",
        description: `Successfully recorded ${entryMode === 'individual' ? 'individual sale' : 'daily total'} of ${formatZMW(parseFloat(amount))}`,
      });

      // Reset form
      setAmount('');
      setCustomerName('');
      setCustomerPhone('');
      setSelectedCustomer(null);
      setCustomerSearch('');
      setDescription('');
      setSaleDate(new Date().toISOString().split('T')[0]);

      // Refresh data
      fetchRecentSales();
      fetchTodaySummary();
    } catch (error) {
      console.error('Error recording sale:', error);
      const message = (error as any)?.message || 'Failed to record sale. Please try again.';
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Sales Management</h1>
      </div>

      <Tabs defaultValue="entry" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entry" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Sales Entry
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Sales History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entry" className="space-y-6 mt-6">
          {/* Sales Entry Content */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Entry Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Record New Sale
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Entry Mode Toggle */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={entryMode === 'individual' ? 'default' : 'outline'}
                    onClick={() => setEntryMode('individual')}
                    className="flex-1"
                  >
                    Individual Sale
                  </Button>
                  <Button
                    type="button"
                    variant={entryMode === 'daily_total' ? 'default' : 'outline'}
                    onClick={() => setEntryMode('daily_total')}
                    className="flex-1"
                  >
                    Daily Total
                  </Button>
                </div>

                {/* Amount */}
                <div>
                  <Label htmlFor="amount">Amount (ZMW)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                {entryMode === 'individual' && (
                  <>
                    {/* Customer Type */}
                    <div>
                      <Label>Customer Type</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          variant={customerType === 'registered' ? 'default' : 'outline'}
                          onClick={() => setCustomerType('registered')}
                          className="flex-1"
                        >
                          <User className="h-4 w-4 mr-2" />
                          Registered
                        </Button>
                        <Button
                          type="button"
                          variant={customerType === 'unregistered' ? 'default' : 'outline'}
                          onClick={() => setCustomerType('unregistered')}
                          className="flex-1"
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Walk-in
                        </Button>
                      </div>
                    </div>

                     {/* Customer Search for Registered */}
                     {customerType === 'registered' && (
                       <div>
                         <Label>Select Customer *</Label>
                         <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                           <PopoverTrigger asChild>
                             <Button
                               variant="outline"
                               role="combobox"
                               aria-expanded={customerSearchOpen}
                               className="w-full justify-between"
                             >
                               {selectedCustomer ? (
                                 <span>{selectedCustomer.name} - {selectedCustomer.email}</span>
                               ) : (
                                 <span className="text-muted-foreground">Search and select customer...</span>
                               )}
                               <Search className="ml-2 h-4 w-4 shrink-0" />
                             </Button>
                           </PopoverTrigger>
                           <PopoverContent className="w-full p-0">
                             <Command>
                               <CommandInput 
                                 placeholder="Search customers..." 
                                 value={customerSearch}
                                 onValueChange={setCustomerSearch}
                               />
                               <CommandList>
                                 <CommandEmpty>No customers found.</CommandEmpty>
                                 <CommandGroup>
                                   {customers.map((customer) => (
                                     <CommandItem
                                       key={customer.id}
                                       onSelect={() => {
                                         setSelectedCustomer(customer);
                                         setCustomerSearchOpen(false);
                                         setCustomerSearch('');
                                       }}
                                       className="cursor-pointer"
                                     >
                                       <div className="flex flex-col">
                                         <span className="font-medium">{customer.name}</span>
                                         <span className="text-sm text-muted-foreground">
                                           {customer.email} • {customer.tier}
                                         </span>
                                         {customer.phone && (
                                           <span className="text-xs text-muted-foreground">{customer.phone}</span>
                                         )}
                                       </div>
                                     </CommandItem>
                                   ))}
                                 </CommandGroup>
                               </CommandList>
                             </Command>
                           </PopoverContent>
                         </Popover>
                       </div>
                     )}

                     {/* Customer Details for Unregistered */}
                     {customerType === 'unregistered' && (
                       <>
                         <div>
                           <Label htmlFor="customerName">Customer Name *</Label>
                           <Input
                             id="customerName"
                             value={customerName}
                             onChange={(e) => setCustomerName(e.target.value)}
                             placeholder="Enter customer name"
                             required
                           />
                         </div>
                         <div>
                           <Label htmlFor="customerPhone">Phone Number (optional)</Label>
                           <Input
                             id="customerPhone"
                             value={customerPhone}
                             onChange={(e) => setCustomerPhone(e.target.value)}
                             placeholder="Enter phone number"
                           />
                         </div>
                       </>
                     )}

                    {/* Payment Method */}
                    <div>
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Sale Date */}
                <div>
                  <Label htmlFor="saleDate">Sale Date</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    value={saleDate}
                    onChange={(e) => setSaleDate(e.target.value)}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="description">Notes (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add any additional notes..."
                    rows={3}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Recording...' : `Record ${entryMode === 'individual' ? 'Sale' : 'Daily Total'}`}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Today's Summary */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Today's Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todaySummary ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Sales</div>
                    <div className="text-2xl font-bold text-primary">{formatZMW(todaySummary.total_amount)}</div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">Registered</div>
                      <div className="font-medium">{formatZMW(todaySummary.registered_customer_sales)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Walk-ins</div>
                      <div className="font-medium">{formatZMW(todaySummary.unregistered_customer_sales)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Transactions</div>
                      <div className="font-medium">{todaySummary.transaction_count}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No sales recorded today
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-auto">
              {recentSales.length > 0 ? (
                <div className="space-y-3">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="font-medium">{formatZMW(sale.amount)}</div>
                          <div className="text-sm text-muted-foreground">
                            {sale.is_registered_customer ? 'Registered Customer' : sale.customer_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleDateString()} • {sale.payment_method}
                          </div>
                        </div>
                        <Badge variant={sale.is_registered_customer ? 'default' : 'secondary'}>
                          {sale.is_registered_customer ? 'Registered' : 'Walk-in'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No recent sales
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <SalesHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Sales;