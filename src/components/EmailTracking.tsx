import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, Eye, MousePointer, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EmailCampaign {
  id: string;
  subject: string;
  sent_date: string;
  recipients: number;
  opened: number;
  clicked: number;
  conversions: number;
  status: string;
}

export const EmailTracking: React.FC = () => {
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmailCampaigns();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('email-campaigns-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_campaigns'
        },
        () => {
          fetchEmailCampaigns();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEmailCampaigns = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('user_id', user.id)
        .order('sent_date', { ascending: false });

      if (error) {
        console.error('Error fetching email campaigns:', error);
        toast({
          title: "Error",
          description: "Failed to fetch email campaigns.",
          variant: "destructive",
        });
        return;
      }

      setEmailCampaigns(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCampaign = () => {
    toast({
      title: "Feature Coming Soon",
      description: "Email campaign creation will be available soon.",
    });
  };

  const totalSent = emailCampaigns.reduce((sum, campaign) => sum + campaign.recipients, 0);
  const totalOpened = emailCampaigns.reduce((sum, campaign) => sum + campaign.opened, 0);
  const totalClicked = emailCampaigns.reduce((sum, campaign) => sum + campaign.clicked, 0);
  const totalConversions = emailCampaigns.reduce((sum, campaign) => sum + campaign.conversions, 0);
  
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0';
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : '0.0';

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Tracking</h1>
          <p className="text-muted-foreground">Monitor your grocery store email campaigns</p>
        </div>
        <Button onClick={handleCreateCampaign}>
          <Mail className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {emailCampaigns.length > 0 ? 'Across all campaigns' : 'No campaigns yet'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalOpened.toLocaleString()} opens
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
            <p className="text-xs text-muted-foreground">
              {totalClicked.toLocaleString()} clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions}</div>
            <p className="text-xs text-muted-foreground">
              {totalConversions > 0 ? 'Total conversions' : 'No conversions yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Campaigns</CardTitle>
          <CardDescription>
            {emailCampaigns.length > 0 
              ? 'Track performance of your grocery store email campaigns'
              : 'No email campaigns found. Create your first campaign to get started.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emailCampaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent Date</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Clicked</TableHead>
                  <TableHead>Open Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.subject}</TableCell>
                    <TableCell>{new Date(campaign.sent_date).toLocaleDateString()}</TableCell>
                    <TableCell>{campaign.recipients.toLocaleString()}</TableCell>
                    <TableCell>{campaign.opened.toLocaleString()}</TableCell>
                    <TableCell>{campaign.clicked.toLocaleString()}</TableCell>
                    <TableCell>
                      {campaign.recipients > 0 
                        ? ((campaign.opened / campaign.recipients) * 100).toFixed(1) + '%'
                        : '0.0%'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={campaign.status === 'completed' ? 'default' : 'secondary'}
                        className={campaign.status === 'completed' 
                          ? 'bg-green-100 text-green-800 border-green-200' 
                          : ''}
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No email campaigns yet</p>
              <Button onClick={handleCreateCampaign}>
                <Mail className="w-4 h-4 mr-2" />
                Create Your First Campaign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};