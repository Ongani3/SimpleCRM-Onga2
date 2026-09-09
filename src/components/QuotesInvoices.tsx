import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, DollarSign, Clock, CheckCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateQuoteDialog } from './CreateQuoteDialog';
import { CreateInvoiceDialog } from './CreateInvoiceDialog';

interface Quote {
  id: string;
  quote_number: string;
  customer_name: string;
  amount: number;
  status: string;
  created_date: string;
  expiry_date: string;
  items_count: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  amount: number;
  status: string;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
}

// Currency formatter for Zambian Kwacha
const formatZMW = (amount: number) => {
  return new Intl.NumberFormat('en-ZM', {
    style: 'currency',
    currency: 'ZMW',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const QuotesInvoices: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      console.log('Fetching quotes and invoices...');
      const [quotesResponse, invoicesResponse] = await Promise.all([
        supabase.from('quotes').select('*').order('created_date', { ascending: false }),
        supabase.from('invoices').select('*').order('issue_date', { ascending: false })
      ]);

      console.log('Quotes response:', quotesResponse);
      console.log('Invoices response:', invoicesResponse);

      if (quotesResponse.error) {
        console.error('Quotes error:', quotesResponse.error);
        throw quotesResponse.error;
      }
      if (invoicesResponse.error) {
        console.error('Invoices error:', invoicesResponse.error);
        throw invoicesResponse.error;
      }

      if (quotesResponse.data) setQuotes(quotesResponse.data);
      if (invoicesResponse.data) setInvoices(invoicesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const markInvoiceAsPaid = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice marked as paid successfully"
      });

      // Refresh data
      fetchData();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      const message = (error as any)?.message || 'Failed to mark invoice as paid';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  };

  const totalQuoteValue = quotes.reduce((sum, quote) => sum + quote.amount, 0);
  const totalInvoiceValue = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      accepted: "bg-green-50 text-green-700 border-green-200", 
      expired: "bg-red-50 text-red-700 border-red-200",
      paid: "bg-green-50 text-green-700 border-green-200",
      overdue: "bg-red-50 text-red-700 border-red-200"
    };
    return styles[status as keyof typeof styles] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quotes & Invoices</h1>
          <p className="text-muted-foreground">Manage wholesale quotes and customer invoicing</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setQuoteDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </Button>
          <Button onClick={() => setInvoiceDialogOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Quote Value</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZMW(totalQuoteValue)}</div>
            <p className="text-xs text-muted-foreground">Active quotes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoice Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatZMW(totalInvoiceValue)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueInvoices}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quotes Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Quotes</CardTitle>
          <CardDescription>Wholesale price quotes for restaurant and business customers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">No quotes found</TableCell>
                </TableRow>
              ) : (
                quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quote_number}</TableCell>
                    <TableCell>{quote.customer_name}</TableCell>
                    <TableCell>{formatZMW(quote.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadge(quote.status)}>
                        {quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(quote.created_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(quote.expiry_date).toLocaleDateString()}</TableCell>
                    <TableCell>{quote.items_count} items</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">View</Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoices Section */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Customer invoices and payment tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issue Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">No invoices found</TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.customer_name}</TableCell>
                    <TableCell>{formatZMW(invoice.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadge(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                    <TableCell>{invoice.paid_date ? new Date(invoice.paid_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">View</Button>
                        {invoice.status === 'pending' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => markInvoiceAsPaid(invoice.id)}
                          >
                            Mark as Paid
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CreateQuoteDialog
        open={quoteDialogOpen}
        onOpenChange={setQuoteDialogOpen}
        onQuoteCreated={fetchData}
      />
      
      <CreateInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        onInvoiceCreated={fetchData}
      />
    </div>
  );
};