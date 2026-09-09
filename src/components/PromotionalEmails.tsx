import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Mail, Clock, Users, Calendar, Plus, Edit, Trash } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PromotionalEmail {
  id: string;
  name: string;
  subject: string;
  content: string;
  trigger_type: 'scheduled' | 'event' | 'manual';
  schedule?: string;
  is_active: boolean;
  target_audience: string;
  last_sent?: string;
  total_sent: number;
  open_rate: number;
  created_at?: string;
  updated_at?: string;
}

export const PromotionalEmails: React.FC = () => {
  const [emails, setEmails] = useState<PromotionalEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<PromotionalEmail | null>(null);
  const [newEmail, setNewEmail] = useState<{
    name: string;
    subject: string;
    content: string;
    trigger_type: 'scheduled' | 'event' | 'manual';
    schedule: string;
    target_audience: string;
    is_active: boolean;
  }>({
    name: '',
    subject: '',
    content: '',
    trigger_type: 'manual',
    schedule: '',
    target_audience: 'All Customers',
    is_active: false
  });
  const { toast } = useToast();

  // Fetch promotional emails from database
  const fetchEmails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('promotional_emails')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmails((data || []) as PromotionalEmail[]);
    } catch (error) {
      console.error('Error fetching promotional emails:', error);
      toast({
        title: "Error",
        description: "Failed to load promotional emails.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();

    // Set up realtime subscription
    const channel = supabase
      .channel('promotional-emails')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'promotional_emails'
        },
        () => {
          fetchEmails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateEmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please log in to create promotional emails.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('promotional_emails')
        .insert({
          user_id: user.id,
          ...newEmail
        });

      if (error) throw error;

      setIsCreateDialogOpen(false);
      setNewEmail({
        name: '',
        subject: '',
        content: '',
        trigger_type: 'manual',
        schedule: '',
        target_audience: 'All Customers',
        is_active: false
      });

      toast({
        title: "Promotional Email Created",
        description: "Your promotional email automation has been set up successfully.",
      });
    } catch (error) {
      console.error('Error creating promotional email:', error);
      toast({
        title: "Error",
        description: "Failed to create promotional email.",
        variant: "destructive",
      });
    }
  };

  const handleSendNow = async (email: PromotionalEmail) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await supabase.functions.invoke('send-promotional-email', {
        body: {
          subject: email.subject,
          content: email.content,
          targetAudience: email.target_audience,
          userId: user.id
        }
      });

      if (response.error) throw response.error;

      // Update the email stats in database
      const recipientCount = response.data?.recipientCount || 100;
      const { error } = await supabase
        .from('promotional_emails')
        .update({
          last_sent: new Date().toISOString(),
          total_sent: email.total_sent + recipientCount
        })
        .eq('id', email.id);

      if (error) throw error;

      toast({
        title: "Email Sent",
        description: `Promotional email "${email.name}" has been sent to ${recipientCount} recipients.`,
      });
    } catch (error) {
      console.error('Error sending promotional email:', error);
      toast({
        title: "Error",
        description: "Failed to send promotional email.",
        variant: "destructive",
      });
    }
  };

  const toggleEmailStatus = async (id: string) => {
    try {
      const email = emails.find(e => e.id === id);
      if (!email) return;

      const { error } = await supabase
        .from('promotional_emails')
        .update({ is_active: !email.is_active })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating email status:', error);
      toast({
        title: "Error",
        description: "Failed to update email status.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteEmail = async (id: string) => {
    try {
      const { error } = await supabase
        .from('promotional_emails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Email Deleted",
        description: "Promotional email has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting promotional email:', error);
      toast({
        title: "Error",
        description: "Failed to delete promotional email.",
        variant: "destructive",
      });
    }
  };

  const handleEditEmail = (email: PromotionalEmail) => {
    setEditingEmail(email);
    setIsEditDialogOpen(true);
  };

  const handleUpdateEmail = async () => {
    if (!editingEmail) return;

    try {
      const { error } = await supabase
        .from('promotional_emails')
        .update({
          name: editingEmail.name,
          subject: editingEmail.subject,
          content: editingEmail.content,
          trigger_type: editingEmail.trigger_type,
          schedule: editingEmail.schedule,
          target_audience: editingEmail.target_audience,
          is_active: editingEmail.is_active
        })
        .eq('id', editingEmail.id);

      if (error) throw error;

      setIsEditDialogOpen(false);
      setEditingEmail(null);

      toast({
        title: "Email Updated",
        description: "Promotional email has been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating promotional email:', error);
      toast({
        title: "Error",
        description: "Failed to update promotional email.",
        variant: "destructive",
      });
    }
  };

  const activeEmails = emails.filter(email => email.is_active).length;
  const totalSent = emails.reduce((sum, email) => sum + email.total_sent, 0);
  const avgOpenRate = emails.length > 0 ? (emails.reduce((sum, email) => sum + email.open_rate, 0) / emails.length).toFixed(1) : 0;
  const thisWeekScheduled = emails.filter(email => email.is_active && email.trigger_type === 'scheduled').length * 7; // Approximate

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-8">
          <div className="text-lg">Loading promotional emails...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Promotional Emails</h1>
          <p className="text-muted-foreground">Automated promotional campaigns and announcements</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Promotion
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Promotional Email</DialogTitle>
              <DialogDescription>
                Set up automated promotional emails for your customers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name</Label>
                  <Input
                    id="name"
                    value={newEmail.name}
                    onChange={(e) => setNewEmail({ ...newEmail, name: e.target.value })}
                    placeholder="e.g., Weekly Flash Sale"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="triggerType">Trigger Type</Label>
                  <Select value={newEmail.trigger_type} onValueChange={(value: any) => setNewEmail({ ...newEmail, trigger_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Send</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="event">Event-Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail({ ...newEmail, subject: e.target.value })}
                  placeholder="Enter email subject line"
                />
              </div>

              {(newEmail.trigger_type === 'scheduled' || newEmail.trigger_type === 'event') && (
                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule</Label>
                  <Input
                    id="schedule"
                    value={newEmail.schedule}
                    onChange={(e) => setNewEmail({ ...newEmail, schedule: e.target.value })}
                    placeholder="e.g., Every Friday 9:00 AM"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Select value={newEmail.target_audience} onValueChange={(value) => setNewEmail({ ...newEmail, target_audience: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Customers">All Customers</SelectItem>
                    <SelectItem value="Loyalty Members">Loyalty Members</SelectItem>
                    <SelectItem value="Premium Members">Premium Members</SelectItem>
                    <SelectItem value="New Customers">New Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Email Content</Label>
                <Textarea
                  id="content"
                  value={newEmail.content}
                  onChange={(e) => setNewEmail({ ...newEmail, content: e.target.value })}
                  placeholder="Enter your promotional email content..."
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={newEmail.is_active}
                  onCheckedChange={(checked) => setNewEmail({ ...newEmail, is_active: checked })}
                />
                <Label htmlFor="isActive">Activate immediately</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateEmail}>Create Campaign</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Promotional Email</DialogTitle>
            <DialogDescription>
              Update your promotional email campaign
            </DialogDescription>
          </DialogHeader>
          {editingEmail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Campaign Name</Label>
                  <Input
                    id="edit-name"
                    value={editingEmail.name}
                    onChange={(e) => setEditingEmail({ ...editingEmail, name: e.target.value })}
                    placeholder="e.g., Weekly Flash Sale"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-triggerType">Trigger Type</Label>
                  <Select value={editingEmail.trigger_type} onValueChange={(value: any) => setEditingEmail({ ...editingEmail, trigger_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual Send</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="event">Event-Based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Email Subject</Label>
                <Input
                  id="edit-subject"
                  value={editingEmail.subject}
                  onChange={(e) => setEditingEmail({ ...editingEmail, subject: e.target.value })}
                  placeholder="Enter email subject line"
                />
              </div>

              {(editingEmail.trigger_type === 'scheduled' || editingEmail.trigger_type === 'event') && (
                <div className="space-y-2">
                  <Label htmlFor="edit-schedule">Schedule</Label>
                  <Input
                    id="edit-schedule"
                    value={editingEmail.schedule || ''}
                    onChange={(e) => setEditingEmail({ ...editingEmail, schedule: e.target.value })}
                    placeholder="e.g., Every Friday 9:00 AM"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-targetAudience">Target Audience</Label>
                <Select value={editingEmail.target_audience} onValueChange={(value) => setEditingEmail({ ...editingEmail, target_audience: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All Customers">All Customers</SelectItem>
                    <SelectItem value="Loyalty Members">Loyalty Members</SelectItem>
                    <SelectItem value="Premium Members">Premium Members</SelectItem>
                    <SelectItem value="New Customers">New Customers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-content">Email Content</Label>
                <Textarea
                  id="edit-content"
                  value={editingEmail.content}
                  onChange={(e) => setEditingEmail({ ...editingEmail, content: e.target.value })}
                  placeholder="Enter your promotional email content..."
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={editingEmail.is_active}
                  onCheckedChange={(checked) => setEditingEmail({ ...editingEmail, is_active: checked })}
                />
                <Label htmlFor="edit-isActive">Active campaign</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateEmail}>Update Campaign</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEmails}</div>
            <p className="text-xs text-muted-foreground">Running promotions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Promotional emails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOpenRate}%</div>
            <p className="text-xs text-muted-foreground">Campaign performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisWeekScheduled}</div>
            <p className="text-xs text-muted-foreground">Emails scheduled</p>
          </CardContent>
        </Card>
      </div>

      {/* Promotional Emails Table */}
      <Card>
        <CardHeader>
          <CardTitle>Promotional Campaigns</CardTitle>
          <CardDescription>Manage your automated promotional email campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <div className="text-lg font-medium">No promotional emails yet</div>
              <p className="text-muted-foreground">Create your first promotional email campaign to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Open Rate</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">{email.name}</TableCell>
                    <TableCell className="max-w-xs truncate">{email.subject}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {email.trigger_type === 'scheduled' && <Clock className="w-3 h-3" />}
                        {email.trigger_type === 'event' && <Calendar className="w-3 h-3" />}
                        {email.trigger_type === 'manual' && <Mail className="w-3 h-3" />}
                        <span className="text-sm">{email.trigger_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{email.target_audience}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={email.is_active}
                          onCheckedChange={() => toggleEmailStatus(email.id)}
                        />
                        <Badge 
                          variant="outline"
                          className={email.is_active 
                            ? "bg-green-50 text-green-700 border-green-200" 
                            : "bg-gray-50 text-gray-700 border-gray-200"
                          }
                        >
                          {email.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>{email.total_sent.toLocaleString()}</TableCell>
                    <TableCell>{email.open_rate}%</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleSendNow(email)}>
                          <Mail className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditEmail(email)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteEmail(email.id)}>
                          <Trash className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};