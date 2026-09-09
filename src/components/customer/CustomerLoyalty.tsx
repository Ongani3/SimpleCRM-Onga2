import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Gift, Star, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerLoyaltyProps {
  user: User;
}

interface LoyaltyAccount {
  id: string;
  current_points: number;
  lifetime_points: number;
  tier: string;
  tier_start_date: string;
  next_tier_points: number;
}

interface PointsTransaction {
  id: string;
  transaction_type: string;
  points: number;
  description: string;
  created_at: string;
  expiry_date: string;
}

interface Reward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  reward_type: string;
  reward_value: number;
  is_active: boolean;
}

export const CustomerLoyalty: React.FC<CustomerLoyaltyProps> = ({ user }) => {
  const [loyaltyAccount, setLoyaltyAccount] = useState<LoyaltyAccount | null>(null);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLoyaltyData();
  }, [user]);

  const loadLoyaltyData = async () => {
    try {
      // First, check for linked CRM customer data
      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select(`
          *,
          customers (
            id,
            name,
            email,
            phone,
            tier,
            points,
            total_spent
          )
        `)
        .eq('user_id', user.id)
        .single();

      // Load loyalty account
      const { data: account, error: accountError } = await supabase
        .from('loyalty_accounts')
        .select('*')
        .eq('customer_user_id', user.id)
        .single();

      if (accountError && accountError.code !== 'PGRST116') {
        throw accountError;
      }

      if (account) {
        // If we have linked CRM data, sync the loyalty account with CRM data
        if (customerProfile?.customers) {
          const crmCustomer = customerProfile.customers;
          if (account.tier !== crmCustomer.tier.toLowerCase() || 
              account.current_points !== crmCustomer.points) {
            
            // Update loyalty account with CRM data
            const { error: updateError } = await supabase
              .from('loyalty_accounts')
              .update({
                tier: crmCustomer.tier.toLowerCase(),
                current_points: crmCustomer.points,
                lifetime_points: crmCustomer.points,
                updated_at: new Date().toISOString()
              })
              .eq('id', account.id);

            if (!updateError) {
              account.tier = crmCustomer.tier.toLowerCase();
              account.current_points = crmCustomer.points;
              account.lifetime_points = crmCustomer.points;
            }
          }
        }
        
        setLoyaltyAccount(account);
        
        // Load points transactions
        const { data: txns, error: txnError } = await supabase
          .from('points_transactions')
          .select('*')
          .eq('loyalty_account_id', account.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (txnError) throw txnError;
        setTransactions(txns || []);
      } else if (customerProfile?.customers) {
        // If no loyalty account but we have CRM data, create one with CRM values
        const crmCustomer = customerProfile.customers;
        const { data: newAccount, error: createError } = await supabase
          .from('loyalty_accounts')
          .insert({
            customer_user_id: user.id,
            current_points: crmCustomer.points,
            lifetime_points: crmCustomer.points,
            tier: crmCustomer.tier.toLowerCase(),
            next_tier_points: crmCustomer.tier.toLowerCase() === 'bronze' ? 500 : 
                              crmCustomer.tier.toLowerCase() === 'silver' ? 1000 : 
                              crmCustomer.tier.toLowerCase() === 'gold' ? 2000 : null
          })
          .select()
          .single();

        if (createError) throw createError;
        loadLoyaltyData(); // Reload after creation
      } else {
        // No CRM data, create basic loyalty account
        const { error: createError } = await supabase
          .from('loyalty_accounts')
          .insert({
            customer_user_id: user.id,
            current_points: 0,
            lifetime_points: 0,
            tier: 'bronze',
            next_tier_points: 500
          });

        if (createError) throw createError;
        loadLoyaltyData(); // Reload after creation
      }

      // Load available rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('rewards')
        .select('*')
        .eq('is_active', true)
        .order('points_required');

      if (rewardsError) throw rewardsError;
      setRewards(rewardsData || []);

    } catch (error) {
      console.error('Error loading loyalty data:', error);
      toast.error('Failed to load loyalty information');
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (reward: Reward) => {
    if (!loyaltyAccount || loyaltyAccount.current_points < reward.points_required) {
      toast.error('Insufficient points for this reward');
      return;
    }

    try {
      // This would typically call an edge function to handle the redemption
      toast.success('Reward redemption functionality will be implemented');
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast.error('Failed to redeem reward');
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'silver': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'gold': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'platinum': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'bronze': return <Trophy className="h-4 w-4 text-amber-600" />;
      case 'silver': return <Trophy className="h-4 w-4 text-gray-600" />;
      case 'gold': return <Trophy className="h-4 w-4 text-yellow-600" />;
      case 'platinum': return <Star className="h-4 w-4 text-purple-600" />;
      default: return <Trophy className="h-4 w-4" />;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'redeemed': return <Gift className="h-4 w-4 text-red-500" />;
      case 'bonus': return <Star className="h-4 w-4 text-blue-500" />;
      case 'expired': return <Calendar className="h-4 w-4 text-gray-500" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!loyaltyAccount) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Loyalty Program</h3>
          <p className="text-muted-foreground">
            Start shopping to join our loyalty program and earn points!
          </p>
        </CardContent>
      </Card>
    );
  }

  const progressToNextTier = loyaltyAccount.next_tier_points 
    ? ((loyaltyAccount.lifetime_points % loyaltyAccount.next_tier_points) / loyaltyAccount.next_tier_points) * 100
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6" />
          Loyalty & Rewards
        </h2>
        <p className="text-muted-foreground">Earn points and redeem amazing rewards</p>
      </div>

      {/* Loyalty Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {loyaltyAccount.current_points}
            </div>
            <p className="text-sm text-muted-foreground">Available to redeem</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Lifetime Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loyaltyAccount.lifetime_points}
            </div>
            <p className="text-sm text-muted-foreground">Total earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Membership Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getTierColor(loyaltyAccount.tier)}>
              {getTierIcon(loyaltyAccount.tier)}
              <span className="ml-1 capitalize">{loyaltyAccount.tier}</span>
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Since {new Date(loyaltyAccount.tier_start_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress to Next Tier */}
      {loyaltyAccount.next_tier_points && (
        <Card>
          <CardHeader>
            <CardTitle>Progress to Next Tier</CardTitle>
            <CardDescription>
              Earn {loyaltyAccount.next_tier_points - (loyaltyAccount.lifetime_points % loyaltyAccount.next_tier_points)} more points to reach the next tier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={progressToNextTier} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground mt-2">
              <span>{loyaltyAccount.lifetime_points % loyaltyAccount.next_tier_points} points</span>
              <span>{loyaltyAccount.next_tier_points} points needed</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest points transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                        {transaction.expiry_date && (
                          <span> • Expires {new Date(transaction.expiry_date).toLocaleDateString()}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className={`font-medium ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.points > 0 ? '+' : ''}{transaction.points}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet. Start shopping to earn points!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Available Rewards */}
      <Card>
        <CardHeader>
          <CardTitle>Available Rewards</CardTitle>
          <CardDescription>Redeem your points for these amazing rewards</CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map((reward) => (
                <div key={reward.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{reward.name}</h3>
                    <Badge variant="outline">
                      {reward.points_required} points
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {reward.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {reward.reward_type === 'discount' && `${reward.reward_value}% off`}
                      {reward.reward_type === 'store_credit' && `$${reward.reward_value} credit`}
                      {reward.reward_type === 'free_shipping' && 'Free shipping'}
                      {reward.reward_type === 'free_product' && 'Free product'}
                    </span>
                    <Button
                      size="sm"
                      disabled={loyaltyAccount.current_points < reward.points_required}
                      onClick={() => redeemReward(reward)}
                    >
                      Redeem
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No rewards available at the moment. Check back later!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};