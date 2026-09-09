import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface CustomerSelectorProps {
  onCustomerChange: (customerId: string | null, customerName: string) => void;
  value: { customerId: string | null; customerName: string };
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  onCustomerChange,
  value
}) => {
  const [useExisting, setUseExisting] = useState(!!value.customerId);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email')
        .order('name');
      
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChange = (checked: boolean) => {
    setUseExisting(checked);
    if (!checked) {
      onCustomerChange(null, '');
    }
  };

  const handleExistingCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      onCustomerChange(customerId, customer.name);
    }
  };

  const handleManualNameChange = (name: string) => {
    onCustomerChange(null, name);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Switch
          id="use-existing"
          checked={useExisting}
          onCheckedChange={handleToggleChange}
        />
        <Label htmlFor="use-existing">Use existing customer</Label>
      </div>

      {useExisting ? (
        <div className="space-y-2">
          <Label htmlFor="customer">Select Customer *</Label>
          <Select 
            value={value.customerId || ''} 
            onValueChange={handleExistingCustomerChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a customer" />
            </SelectTrigger>
            <SelectContent>
              {loading ? (
                <SelectItem value="" disabled>Loading customers...</SelectItem>
              ) : customers.length === 0 ? (
                <SelectItem value="" disabled>No customers found</SelectItem>
              ) : (
                customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="customer-name">Customer Name *</Label>
          <Input
            id="customer-name"
            value={value.customerName}
            onChange={(e) => handleManualNameChange(e.target.value)}
            placeholder="Enter customer name"
            required
          />
        </div>
      )}
    </div>
  );
};