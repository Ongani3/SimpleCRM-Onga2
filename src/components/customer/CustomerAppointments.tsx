import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, Plus, User as UserIcon, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerAppointmentsProps {
  user: User;
}

interface Appointment {
  id: string;
  appointment_number: string;
  scheduled_date: string;
  scheduled_time: string;
  end_time: string;
  status: string;
  notes: string;
  service: Service;
}

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

export const CustomerAppointments: React.FC<CustomerAppointmentsProps> = ({ user }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    service_id: '',
    store_user_id: '',
    scheduled_date: '',
    scheduled_time: '',
    notes: ''
  });

  useEffect(() => {
    loadAppointments();
    loadServices();
    loadStores();
  }, [user]);

  const loadAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          service:services(*)
        `)
        .eq('customer_user_id', user.id)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('id, store_name, user_id')
        .order('store_name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const bookAppointment = async () => {
    if (!newAppointment.service_id || !newAppointment.store_user_id || !newAppointment.scheduled_date || !newAppointment.scheduled_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const appointmentNumber = `APT-${Date.now()}`;
      const selectedService = services.find(s => s.id === newAppointment.service_id);
      
      if (!selectedService) {
        toast.error('Selected service not found');
        return;
      }

      // Calculate end time
      const startTime = new Date(`${newAppointment.scheduled_date}T${newAppointment.scheduled_time}`);
      const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000);

      const { error } = await supabase
        .from('appointments')
        .insert({
          customer_user_id: user.id,
          store_user_id: newAppointment.store_user_id,
          service_id: newAppointment.service_id,
          appointment_number: appointmentNumber,
          scheduled_date: newAppointment.scheduled_date,
          scheduled_time: newAppointment.scheduled_time,
          end_time: endTime.toTimeString().split(' ')[0],
          notes: newAppointment.notes,
          status: 'scheduled'
        });

      if (error) throw error;

      toast.success('Appointment booked successfully');
      setShowBooking(false);
      setNewAppointment({
        service_id: '',
        store_user_id: '',
        scheduled_date: '',
        scheduled_time: '',
        notes: ''
      });
      loadAppointments();
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment');
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'Cancelled by customer'
        })
        .eq('id', appointmentId);

      if (error) throw error;

      toast.success('Appointment cancelled');
      loadAppointments();
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const rescheduleAppointment = async (appointmentId: string) => {
    // Placeholder for reschedule functionality
    toast.success('Reschedule functionality will be implemented');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'confirmed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in_progress': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'completed': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'no_show': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-muted-foreground/10 text-muted-foreground';
    }
  };

  const isUpcoming = (date: string, time: string) => {
    const appointmentDateTime = new Date(`${date}T${time}`);
    return appointmentDateTime > new Date();
  };

  const canCancel = (appointment: Appointment) => {
    return isUpcoming(appointment.scheduled_date, appointment.scheduled_time) && 
           appointment.status === 'scheduled';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Appointments
          </h2>
          <p className="text-muted-foreground">Book and manage your service appointments</p>
        </div>
        <Dialog open={showBooking} onOpenChange={setShowBooking}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Book Appointment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Book New Appointment</DialogTitle>
              <DialogDescription>
                Select a service and schedule your appointment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="store">Store</Label>
                <Select value={newAppointment.store_user_id} onValueChange={(value) => setNewAppointment(prev => ({...prev, store_user_id: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.user_id}>
                        {store.store_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="service">Service</Label>
                <Select value={newAppointment.service_id} onValueChange={(value) => setNewAppointment(prev => ({...prev, service_id: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - {service.duration_minutes}min - ${service.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newAppointment.scheduled_date}
                    onChange={(e) => setNewAppointment(prev => ({...prev, scheduled_date: e.target.value}))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={newAppointment.scheduled_time}
                    onChange={(e) => setNewAppointment(prev => ({...prev, scheduled_time: e.target.value}))}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment(prev => ({...prev, notes: e.target.value}))}
                  placeholder="Any special requests or notes for your appointment"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBooking(false)}>
                  Cancel
                </Button>
                <Button onClick={bookAppointment}>
                  Book Appointment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Appointments List */}
      <div className="space-y-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <Card key={appointment.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5" />
                      {appointment.service.name}
                    </CardTitle>
                    <CardDescription>
                      Appointment #{appointment.appointment_number}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusBadgeColor(appointment.status)}>
                    {appointment.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(appointment.scheduled_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{appointment.scheduled_time} - {appointment.end_time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Duration: {appointment.service.duration_minutes} minutes</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm"><strong>Service:</strong> {appointment.service.name}</p>
                      <p className="text-sm"><strong>Price:</strong> ${appointment.service.price}</p>
                      {appointment.notes && (
                        <p className="text-sm"><strong>Notes:</strong> {appointment.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-4 border-t">
                    {canCancel(appointment) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => rescheduleAppointment(appointment.id)}
                        >
                          Reschedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelAppointment(appointment.id)}
                        >
                          Cancel
                        </Button>
                      </>
                    )}
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No appointments</h3>
              <p className="text-muted-foreground mb-4">
                You haven't booked any appointments yet.
              </p>
              <Button onClick={() => setShowBooking(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Book Your First Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};