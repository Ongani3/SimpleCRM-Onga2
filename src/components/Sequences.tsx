import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Zap, Play, Pause, Users, Calendar } from 'lucide-react';

const sequences = [
  {
    id: 1,
    name: "New Customer Welcome",
    description: "Welcome new grocery shoppers with store guide and first-purchase discount",
    status: "active",
    enrolledContacts: 234,
    completionRate: 78,
    steps: 4,
    lastModified: "2024-01-12"
  },
  {
    id: 2,
    name: "Loyalty Points Reminder",
    description: "Remind customers to use their accumulated loyalty points",
    status: "active", 
    enrolledContacts: 567,
    completionRate: 85,
    steps: 3,
    lastModified: "2024-01-10"
  },
  {
    id: 3,
    name: "Cart Abandonment Recovery",
    description: "Re-engage customers who left items in their online cart",
    status: "paused",
    enrolledContacts: 89,
    completionRate: 62,
    steps: 5,
    lastModified: "2024-01-08"
  },
  {
    id: 4,
    name: "Weekly Produce Freshness",
    description: "Weekly updates on fresh produce arrivals and seasonal specials",
    status: "active",
    enrolledContacts: 1203,
    completionRate: 92,
    steps: 2,
    lastModified: "2024-01-15"
  }
];

export const Sequences: React.FC = () => {
  const activeSequences = sequences.filter(seq => seq.status === 'active').length;
  const totalEnrolled = sequences.reduce((sum, seq) => sum + seq.enrolledContacts, 0);
  const avgCompletionRate = (sequences.reduce((sum, seq) => sum + seq.completionRate, 0) / sequences.length).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Sequences</h1>
          <p className="text-muted-foreground">Automated email workflows for customer engagement</p>
        </div>
        <Button>
          <Zap className="w-4 h-4 mr-2" />
          Create Sequence
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sequences</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSequences}</div>
            <p className="text-xs text-muted-foreground">Running workflows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrolled.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total in sequences</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">Sequence completion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4K</div>
            <p className="text-xs text-muted-foreground">Emails sent via sequences</p>
          </CardContent>
        </Card>
      </div>

      {/* Sequences Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Sequences</CardTitle>
          <CardDescription>Manage your automated customer communication workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sequence Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Completion Rate</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sequences.map((sequence) => (
                <TableRow key={sequence.id}>
                  <TableCell className="font-medium">{sequence.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs">
                    {sequence.description}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={sequence.status === 'active' 
                        ? "bg-green-50 text-green-700 border-green-200" 
                        : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }
                    >
                      {sequence.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{sequence.enrolledContacts}</TableCell>
                  <TableCell>{sequence.completionRate}%</TableCell>
                  <TableCell>{sequence.steps} steps</TableCell>
                  <TableCell>{sequence.lastModified}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        {sequence.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};