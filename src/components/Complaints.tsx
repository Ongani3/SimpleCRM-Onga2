import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Clock, CheckCircle, XCircle, User, Mail, Phone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Complaint {
  id: string;
  subject: string;
  message: string;
  order_ref: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  customer_user_id: string;
}

const Complaints = () => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchComplaints();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('complaints-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'complaints'
      }, () => {
        fetchComplaints();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchComplaints = async () => {
    try {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComplaints(data || []);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast({
        title: "Error",
        description: "Failed to load complaints",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateComplaintStatus = async (complaintId: string, status: string, notes?: string) => {
    setUpdating(true);
    try {
      const updateData: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };
      
      if (notes !== undefined) {
        updateData.admin_notes = notes;
      }

      const { error } = await supabase
        .from('complaints')
        .update(updateData)
        .eq('id', complaintId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Complaint updated successfully",
      });

      setSelectedComplaint(null);
      fetchComplaints();
    } catch (error) {
      console.error('Error updating complaint:', error);
      toast({
        title: "Error",
        description: "Failed to update complaint",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4" />;
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />;
      case 'closed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'resolved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading complaints...</p>
        </div>
      </div>
    );
  }

  if (selectedComplaint) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setSelectedComplaint(null)}>
            ← Back
          </Button>
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Complaint Details</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>{selectedComplaint.subject}</CardTitle>
                <CardDescription>
                  Submitted {formatDate(selectedComplaint.created_at)}
                  {selectedComplaint.order_ref && ` • Order: ${selectedComplaint.order_ref}`}
                </CardDescription>
              </div>
              <Badge className={getStatusColor(selectedComplaint.status)}>
                {getStatusIcon(selectedComplaint.status)}
                <span className="ml-1 capitalize">{selectedComplaint.status}</span>
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Customer Message</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="whitespace-pre-wrap">{selectedComplaint.message}</p>
              </div>
            </div>

            {selectedComplaint.admin_notes && (
              <div>
                <h3 className="font-medium mb-2">Admin Notes</h3>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap">{selectedComplaint.admin_notes}</p>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-medium mb-2">Add Admin Notes</h3>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this complaint..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => updateComplaintStatus(selectedComplaint.id, 'resolved', adminNotes)}
                disabled={updating}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Resolved
              </Button>
              <Button
                variant="outline"
                onClick={() => updateComplaintStatus(selectedComplaint.id, 'closed', adminNotes)}
                disabled={updating}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Close
              </Button>
              {adminNotes && (
                <Button
                  variant="secondary"
                  onClick={() => updateComplaintStatus(selectedComplaint.id, selectedComplaint.status, adminNotes)}
                  disabled={updating}
                >
                  Save Notes
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Customer Complaints</h1>
      </div>

      {complaints.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No complaints yet</h3>
            <p className="text-muted-foreground">
              Customer complaints will appear here when they are submitted through the customer portal.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {complaints.map((complaint) => (
            <Card key={complaint.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-6" onClick={() => setSelectedComplaint(complaint)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <User className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <h3 className="font-medium">{complaint.subject}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {complaint.message}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
                      <span>{formatDate(complaint.created_at)}</span>
                      {complaint.order_ref && (
                        <span>Order: {complaint.order_ref}</span>
                      )}
                    </div>
                  </div>
                  
                  <Badge className={getStatusColor(complaint.status)}>
                    {getStatusIcon(complaint.status)}
                    <span className="ml-1 capitalize">{complaint.status}</span>
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Complaints;