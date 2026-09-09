import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { RefundDialog } from './RefundDialog';
import { 
  Calendar, 
  Filter, 
  Search, 
  RotateCcw, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown,
  Eye,
  RefreshCw
} from 'lucide-react';

interface Sale {
  id: string;
  amount: number;
  customer_name?: string;
  customer_phone?: string;
  payment_method: string;
  transaction_type: string;
  description?: string;
  sale_date: string;
  created_at: string;
  is_registered_customer: boolean;
  is_refunded: boolean;
  refunded_amount: number;
  refunded_date?: string;
}

const formatZMW = (amount: number): string => {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount).replace('ZMW', 'K');
};

const getPaymentMethodBadge = (method: string) => {
  const variants: { [key: string]: 'default' | 'secondary' | 'outline' } = {
    cash: 'default',
    mobile_money: 'secondary',
    card: 'outline',
    bank_transfer: 'outline'
  };
  return variants[method] || 'default';
};

const SalesHistory = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [amountMinFilter, setAmountMinFilter] = useState('');
  const [amountMaxFilter, setAmountMaxFilter] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Selection state for bulk actions
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  const refreshData = () => {
    fetchSales();
    // Trigger dashboard refresh by emitting a custom event
    window.dispatchEvent(new CustomEvent('salesDataChanged'));
  };

  useEffect(() => {
    fetchSales();

    // Real-time updates for sales and refunds
    const channel = supabase
      .channel('sales-refunds-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales' },
        () => {
          fetchSales();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'refunds' },
        () => {
          fetchSales();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterSales();
  }, [sales, searchTerm, customerTypeFilter, paymentMethodFilter, dateFromFilter, dateToFilter, amountMinFilter, amountMaxFilter]);

  const fetchSales = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('store_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSales(data || []);
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSales = () => {
    let filtered = [...sales];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sale => 
        sale.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.customer_phone?.includes(searchTerm)
      );
    }

    // Customer type filter
    if (customerTypeFilter !== 'all') {
      filtered = filtered.filter(sale => 
        customerTypeFilter === 'registered' ? sale.is_registered_customer : !sale.is_registered_customer
      );
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(sale => sale.payment_method === paymentMethodFilter);
    }

    // Date range filter
    if (dateFromFilter) {
      filtered = filtered.filter(sale => new Date(sale.sale_date) >= new Date(dateFromFilter));
    }
    if (dateToFilter) {
      filtered = filtered.filter(sale => new Date(sale.sale_date) <= new Date(dateToFilter));
    }

    // Amount range filter
    if (amountMinFilter) {
      filtered = filtered.filter(sale => sale.amount >= parseFloat(amountMinFilter));
    }
    if (amountMaxFilter) {
      filtered = filtered.filter(sale => sale.amount <= parseFloat(amountMaxFilter));
    }

    setFilteredSales(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const processBulkRefunds = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const salesIds = Array.from(selectedSales);
      const salesToRefund = sales.filter(sale => salesIds.includes(sale.id));
      
      // Create refund records for each selected sale
      const refundRecords = salesToRefund.map(sale => ({
        store_user_id: user.id,
        original_sale_id: sale.id,
        refund_amount: sale.amount - (sale.refunded_amount || 0),
        refund_reason: 'bulk_administrative_refund',
        refund_method: sale.payment_method,
        processed_by: user.id,
        approval_status: 'approved',
        approved_by: user.id,
        approval_date: new Date().toISOString(),
        notes: 'Bulk refund processed via sales history',
      }));

      // Insert refund records
      const { error: refundError } = await supabase
        .from('refunds')
        .insert(refundRecords);

      if (refundError) throw refundError;

      // Update sales as refunded  
      for (const saleId of salesIds) {
        const sale = sales.find(s => s.id === saleId);
        if (sale) {
          const { error: updateError } = await supabase
            .from('sales')
            .update({
              is_refunded: true,
              refunded_date: new Date().toISOString(),
              refunded_amount: sale.amount,
            })
            .eq('id', saleId);

          if (updateError) throw updateError;
        }
      }

      toast({
        title: "Success",
        description: `${salesIds.length} sales refunded successfully`,
      });

      setSelectedSales(new Set());
      refreshData();
    } catch (error: any) {
      console.error('Error processing bulk refunds:', error);
      toast({
        title: "Error",
        description: "Failed to process selected refunds",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCustomerTypeFilter('all');
    setPaymentMethodFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setAmountMinFilter('');
    setAmountMaxFilter('');
  };

  const toggleSelectAll = () => {
    if (selectedSales.size === paginatedSales.length) {
      setSelectedSales(new Set());
    } else {
      setSelectedSales(new Set(paginatedSales.map(sale => sale.id)));
    }
  };

  const toggleSelectSale = (saleId: string) => {
    const newSet = new Set(selectedSales);
    if (newSet.has(saleId)) {
      newSet.delete(saleId);
    } else {
      newSet.add(saleId);
    }
    setSelectedSales(newSet);
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-lg">Loading sales history...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Sales History</h2>
        </div>
        <div className="flex items-center gap-2">
          {selectedSales.size > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Process Refunds ({selectedSales.size})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Process Bulk Refunds</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to process refunds for {selectedSales.size} selected sales? This will refund the full amount for each sale.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={processBulkRefunds}>Process Refunds</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search customers, notes, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Customer Type Filter */}
            <div>
              <Label>Customer Type</Label>
              <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="unregistered">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div>
              <Label htmlFor="dateFrom">Date From</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFromFilter}
                onChange={(e) => setDateFromFilter(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Date To</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateToFilter}
                onChange={(e) => setDateToFilter(e.target.value)}
              />
            </div>

            {/* Amount Range */}
            <div>
              <Label htmlFor="amountMin">Min Amount</Label>
              <Input
                id="amountMin"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountMinFilter}
                onChange={(e) => setAmountMinFilter(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="amountMax">Max Amount</Label>
              <Input
                id="amountMax"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amountMaxFilter}
                onChange={(e) => setAmountMaxFilter(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Sales Transactions ({filteredSales.length} total)
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredSales.length)} of {filteredSales.length}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No sales found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSales.size === paginatedSales.length && paginatedSales.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-32">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => (
                      <TableRow key={sale.id} className={sale.is_refunded ? 'opacity-60' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSales.has(sale.id)}
                            onCheckedChange={() => toggleSelectSale(sale.id)}
                            disabled={sale.is_refunded}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {new Date(sale.sale_date).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{sale.customer_name || 'Walk-in Customer'}</div>
                          {sale.customer_phone && (
                            <div className="text-xs text-muted-foreground">{sale.customer_phone}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={sale.is_registered_customer ? 'default' : 'secondary'}>
                            {sale.is_registered_customer ? 'Registered' : 'Walk-in'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatZMW(sale.amount)}
                          {sale.is_refunded && sale.refunded_amount > 0 && (
                            <div className="text-xs text-red-600">
                              -{formatZMW(sale.refunded_amount)} refunded
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPaymentMethodBadge(sale.payment_method)}>
                            {sale.payment_method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.is_refunded ? (
                            <Badge variant="destructive">
                              {sale.refunded_amount >= sale.amount ? 'Fully Refunded' : 'Partially Refunded'}
                            </Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-32 truncate text-sm text-muted-foreground">
                            {sale.description || '—'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <RefundDialog 
                              sale={sale} 
                              onRefundProcessed={refreshData}
                              trigger={
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  disabled={sale.is_refunded && sale.refunded_amount >= sale.amount}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesHistory;