import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RotateCcw } from 'lucide-react';

interface Sale {
  id: string;
  amount: number;
  customer_name?: string;
  sale_date: string;
  payment_method: string;
  is_registered_customer: boolean;
  refunded_amount: number;
  is_refunded: boolean;
  refunded_date?: string;
}

interface RefundDialogProps {
  sale: Sale;
  onRefundProcessed: () => void;
  trigger?: React.ReactNode;
}

export const RefundDialog = ({ sale, onRefundProcessed, trigger }: RefundDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState(sale.amount.toString());
  const [refundReason, setRefundReason] = useState('');
  const [refundMethod, setRefundMethod] = useState(sale.payment_method);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const maxRefundAmount = sale.amount - (sale.refunded_amount || 0);
  const isPartiallyRefunded = (sale.refunded_amount || 0) > 0;

  const handleProcessRefund = async () => {
    if (!refundReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a refund reason",
        variant: "destructive",
      });
      return;
    }

    const refundAmountNum = parseFloat(refundAmount);
    if (isNaN(refundAmountNum) || refundAmountNum <= 0 || refundAmountNum > maxRefundAmount) {
      toast({
        title: "Error",
        description: `Refund amount must be between 0 and ${maxRefundAmount.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create refund record
      const { error: refundError } = await supabase
        .from('refunds')
        .insert({
          store_user_id: user.id,
          original_sale_id: sale.id,
          refund_amount: refundAmountNum,
          refund_reason: refundReason,
          refund_method: refundMethod,
          processed_by: user.id,
          approval_status: 'approved',
          approved_by: user.id,
          approval_date: new Date().toISOString(),
          notes: notes || null,
        });

      if (refundError) throw refundError;

      // Update sale record
      const newRefundedAmount = (sale.refunded_amount || 0) + refundAmountNum;
      const isFullyRefunded = newRefundedAmount >= sale.amount;

      const { error: saleUpdateError } = await supabase
        .from('sales')
        .update({
          refunded_amount: newRefundedAmount,
          is_refunded: isFullyRefunded,
          refunded_date: isFullyRefunded ? new Date().toISOString() : sale.refunded_date,
        })
        .eq('id', sale.id);

      if (saleUpdateError) throw saleUpdateError;

      toast({
        title: "Success",
        description: `Refund of K${refundAmountNum.toFixed(2)} processed successfully`,
      });

      setIsOpen(false);
      onRefundProcessed();
    } catch (error: any) {
      console.error('Error processing refund:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process refund",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            {isPartiallyRefunded ? 'Partial Refund' : 'Process Refund'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Sale Information */}
          <div className="bg-muted/50 p-3 rounded-lg space-y-2">
            <div className="text-sm text-muted-foreground">Original Sale</div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span className="font-medium">K{sale.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer:</span>
              <span className="font-medium">{sale.customer_name || 'Walk-in Customer'}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span className="font-medium">{new Date(sale.sale_date).toLocaleDateString()}</span>
            </div>
            {isPartiallyRefunded && (
              <div className="flex justify-between text-orange-600">
                <span>Already Refunded:</span>
                <span className="font-medium">K{(sale.refunded_amount || 0).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Available for Refund:</span>
              <span className="font-medium text-green-600">K{maxRefundAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Refund Amount */}
          <div>
            <Label htmlFor="refund-amount">Refund Amount (K)</Label>
            <Input
              id="refund-amount"
              type="number"
              step="0.01"
              max={maxRefundAmount}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="Enter refund amount"
            />
          </div>

          {/* Refund Reason */}
          <div>
            <Label htmlFor="refund-reason">Refund Reason *</Label>
            <Select value={refundReason} onValueChange={setRefundReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select refund reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="customer_request">Customer Request</SelectItem>
                <SelectItem value="defective_product">Defective Product</SelectItem>
                <SelectItem value="wrong_item">Wrong Item</SelectItem>
                <SelectItem value="damaged_goods">Damaged Goods</SelectItem>
                <SelectItem value="duplicate_charge">Duplicate Charge</SelectItem>
                <SelectItem value="administrative_error">Administrative Error</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refund Method */}
          <div>
            <Label htmlFor="refund-method">Refund Method</Label>
            <Select value={refundMethod} onValueChange={setRefundMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="store_credit">Store Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this refund..."
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleProcessRefund} disabled={processing}>
              {processing ? 'Processing...' : `Process Refund K${parseFloat(refundAmount || '0').toFixed(2)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};