import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Store, Mail, Globe, Phone, MapPin } from "lucide-react";

interface StoreSettings {
  store_name: string;
  store_tagline: string;
  store_address: string;
  store_city: string;
  store_state: string;
  store_zip: string;
  contact_email: string;
  from_email: string;
  website_url: string;
  phone: string;
}

export default function StoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>({
    store_name: "Fresh Grocery Store",
    store_tagline: "Your neighborhood grocery destination",
    store_address: "123 Main Street",
    store_city: "City",
    store_state: "State",
    store_zip: "12345",
    contact_email: "contact@store.com",
    from_email: "promotions@resend.dev",
    website_url: "",
    phone: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchStoreSettings();
  }, []);

  const fetchStoreSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setSettings({
          store_name: data.store_name,
          store_tagline: data.store_tagline,
          store_address: data.store_address,
          store_city: data.store_city,
          store_state: data.store_state,
          store_zip: data.store_zip,
          contact_email: data.contact_email,
          from_email: data.from_email,
          website_url: data.website_url || "",
          phone: data.phone || ""
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to load store settings: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('store_settings')
        .upsert({
          user_id: user.id,
          ...settings
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Store settings saved successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Failed to save settings: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof StoreSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Store Settings</h2>
        <p className="text-muted-foreground">
          Configure your store information for promotional emails and customer communications.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Information
            </CardTitle>
            <CardDescription>
              Basic information about your store that appears in emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="store_name">Store Name</Label>
              <Input
                id="store_name"
                value={settings.store_name}
                onChange={(e) => handleChange('store_name', e.target.value)}
                placeholder="Fresh Grocery Store"
              />
            </div>
            <div>
              <Label htmlFor="store_tagline">Store Tagline</Label>
              <Input
                id="store_tagline"
                value={settings.store_tagline}
                onChange={(e) => handleChange('store_tagline', e.target.value)}
                placeholder="Your neighborhood grocery destination"
              />
            </div>
            <div>
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                value={settings.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                placeholder="https://yourstore.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Contact details for customer communications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={settings.contact_email}
                onChange={(e) => handleChange('contact_email', e.target.value)}
                placeholder="contact@store.com"
              />
            </div>
            <div>
              <Label htmlFor="from_email">From Email (for promotional emails)</Label>
              <Input
                id="from_email"
                type="email"
                value={settings.from_email}
                onChange={(e) => handleChange('from_email', e.target.value)}
                placeholder="promotions@resend.dev"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Store Address
            </CardTitle>
            <CardDescription>
              Physical address that appears in email footers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="store_address">Street Address</Label>
              <Input
                id="store_address"
                value={settings.store_address}
                onChange={(e) => handleChange('store_address', e.target.value)}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="store_city">City</Label>
                <Input
                  id="store_city"
                  value={settings.store_city}
                  onChange={(e) => handleChange('store_city', e.target.value)}
                  placeholder="City"
                />
              </div>
              <div>
                <Label htmlFor="store_state">State</Label>
                <Input
                  id="store_state"
                  value={settings.store_state}
                  onChange={(e) => handleChange('store_state', e.target.value)}
                  placeholder="State"
                />
              </div>
              <div>
                <Label htmlFor="store_zip">ZIP Code</Label>
                <Input
                  id="store_zip"
                  value={settings.store_zip}
                  onChange={(e) => handleChange('store_zip', e.target.value)}
                  placeholder="12345"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
}