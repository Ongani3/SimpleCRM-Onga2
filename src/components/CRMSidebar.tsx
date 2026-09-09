import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Users, Target, MessageSquare, Building2, Mail, Zap, FileText, BarChart3, Settings, Plus, Star, Home, DollarSign, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
interface SidebarSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  items?: {
    id: string;
    title: string;
    icon: React.ReactNode;
    count?: number;
  }[];
}
interface CRMSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeWorkspace: string;
  onWorkspaceChange: (workspace: string) => void;
  activeSection: string | null;
  onSectionChange: (section: string | null) => void;
}
export const CRMSidebar: React.FC<CRMSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  activeWorkspace,
  onWorkspaceChange,
  activeSection,
  onSectionChange
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['workspace', 'favorites']));
  const [realtimeCounts, setRealtimeCounts] = useState({
    customers: 0,
    promotions: 0,
    complaints: 0,
    sales: 0
  });

  // Fetch initial counts and set up realtime subscriptions
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const {
          data: {
            user
          }
        } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch customers count
        const {
          count: customersCount
        } = await supabase.from('customers').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user.id);

        // Fetch store promotions count
        const {
          count: promotionsCount
        } = await (supabase as any).from('promotions').select('*', {
          count: 'exact',
          head: true
        }).eq('user_id', user.id);

        // Fetch complaints count (RLS restricts to this owner's stores)
        const {
          count: complaintsCount
        } = await supabase.from('complaints').select('*', {
          count: 'exact',
          head: true
        });
        
        // Fetch today's sales count
        const today = new Date().toISOString().split('T')[0];
        const {
          count: salesCount
        } = await supabase.from('sales').select('*', {
          count: 'exact',
          head: true
        }).eq('store_user_id', user.id).eq('sale_date', today);
        
        setRealtimeCounts(prev => ({
          ...prev,
          customers: customersCount || 0,
          promotions: promotionsCount || 0,
          complaints: complaintsCount || 0,
          sales: salesCount || 0
        }));
      } catch (error) {
        console.error('Error fetching counts:', error);
      }
    };
    fetchCounts();

    // Set up realtime subscription for tables
    const channel = supabase.channel('sidebar-counts').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'customers'
    }, () => {
      fetchCounts();
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'promotions'
    }, () => {
      fetchCounts();
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'complaints'
    }, () => {
      fetchCounts();
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'sales'
    }, () => {
      fetchCounts();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const workspaceItems = [{
    id: 'customers',
    title: 'Customers',
    icon: <Users className="w-4 h-4" />,
    count: realtimeCounts.customers
  }, {
    id: 'promotions',
    title: 'Promotions',
    icon: <Target className="w-4 h-4" />,
    count: realtimeCounts.promotions
  }, {
    id: 'complaints',
    title: 'Complaints',
    icon: <MessageSquare className="w-4 h-4" />,
    count: realtimeCounts.complaints
  }];
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };
  const mainSections: SidebarSection[] = [{
    id: 'dashboard',
    title: 'Dashboard',
    icon: <Home className="w-4 h-4" />,
    isExpanded: expandedSections.has('dashboard')
  }, {
    id: 'sales',
    title: 'Sales',
    icon: <DollarSign className="w-4 h-4" />,
    isExpanded: expandedSections.has('sales')
  }, {
    id: 'sequences',
    title: 'Sequences',
    icon: <Zap className="w-4 h-4" />,
    isExpanded: expandedSections.has('sequences')
  }, {
    id: 'quotes',
    title: 'Quotes and Invoices',
    icon: <FileText className="w-4 h-4" />,
    isExpanded: expandedSections.has('quotes')
  }, {
    id: 'reports',
    title: 'Reports',
    icon: <BarChart3 className="w-4 h-4" />,
    isExpanded: expandedSections.has('reports')
  }, {
    id: 'promotions',
    title: 'Promotional Emails',
    icon: <Target className="w-4 h-4" />,
    isExpanded: expandedSections.has('promotions')
  }, {
    id: 'calls',
    title: 'Calls',
    icon: <Phone className="w-4 h-4" />,
    isExpanded: expandedSections.has('calls')
  }, {
    id: 'settings',
    title: 'Store Settings',
    icon: <Settings className="w-4 h-4" />,
    isExpanded: expandedSections.has('settings')
  }];
  const favoriteItems = [{
    id: 'hot-leads',
    title: 'Hot Leads',
    icon: <Star className="w-4 h-4" />
  }];
  return <div className={cn("min-h-screen bg-sidebar-bg text-sidebar-foreground transition-all duration-300 flex flex-col border-r border-sidebar-border", isCollapsed ? "w-16" : "w-64")}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className={cn("flex items-center gap-2", isCollapsed && "justify-center")}>
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && <span className="text-lg font-semibold text-sidebar-foreground">Simple CRM</span>}
          </div>
          
        </div>
      </div>

      {/* Workspace Selector */}
      {!isCollapsed && <div className="p-4 border-b border-sidebar-border">
          

          {/* Workspace Items */}
          <div className="space-y-1">
            {workspaceItems.map(item => <button key={item.id} onClick={() => {
          onWorkspaceChange(item.id);
          onSectionChange(null);
        }} className={cn("w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors", activeWorkspace === item.id && !activeSection ? "bg-primary text-primary-foreground" : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-border")}>
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                <span className="text-xs bg-sidebar-border text-sidebar-muted px-2 py-1 rounded-full">
                  {item.count}
                </span>
              </button>)}
          </div>
        </div>}

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {/* Main Sections */}
          {mainSections.map(section => <div key={section.id}>
              <button onClick={() => {
            if (!isCollapsed) {
              toggleSection(section.id);
            }
            onSectionChange(section.id);
            onWorkspaceChange('');
          }} className={cn("w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors", activeSection === section.id ? "bg-primary text-primary-foreground" : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-border")}>
                <div className="flex items-center gap-2">
                  {section.icon}
                  {!isCollapsed && <span>{section.title}</span>}
                </div>
                {!isCollapsed && <ChevronRight className={cn("w-4 h-4 transition-transform", section.isExpanded && "rotate-90")} />}
              </button>
            </div>)}

          {/* Favorites Section */}
          {!isCollapsed && <div className="mt-6">
              
              
              {expandedSections.has('favorites')}
            </div>}
        </div>
      </div>

      {/* Settings */}
      
    </div>;
};