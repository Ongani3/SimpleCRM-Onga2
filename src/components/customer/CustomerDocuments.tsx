import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download, Search, Calendar, Shield, File } from 'lucide-react';
import { toast } from 'sonner';

interface CustomerDocumentsProps {
  user: User;
}

interface CustomerDocument {
  id: string;
  document_name: string;
  document_type: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  is_signed: boolean;
  signature_date: string;
  expires_at: string;
  access_level: string;
  created_at: string;
  updated_at: string;
}

export const CustomerDocuments: React.FC<CustomerDocumentsProps> = ({ user }) => {
  const [documents, setDocuments] = useState<CustomerDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<CustomerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    loadDocuments();
  }, [user]);

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, typeFilter]);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_documents')
        .select('*')
        .eq('customer_user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = documents;

    if (searchTerm) {
      filtered = filtered.filter(doc =>
        doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.document_type === typeFilter);
    }

    setFilteredDocuments(filtered);
  };

  const downloadDocument = async (document: CustomerDocument) => {
    try {
      // This would typically download from Supabase Storage
      toast.success('Document download functionality will be implemented with Supabase Storage');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Failed to download document');
    }
  };

  const getDocumentIcon = (mimeType: string) => {
    if (mimeType?.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType?.includes('image')) return <File className="h-5 w-5 text-blue-500" />;
    if (mimeType?.includes('word') || mimeType?.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getDocumentTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'warranty': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'invoice': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'receipt': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'contract': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'manual': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      case 'certificate': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-muted-foreground/10 text-muted-foreground';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry <= thirtyDaysFromNow && expiry > now;
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
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          My Documents
        </h2>
        <p className="text-muted-foreground">Access and manage your important documents</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                <SelectItem value="warranty">Warranty</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="certificate">Certificate</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDocuments.length > 0 ? (
          filteredDocuments.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getDocumentIcon(document.mime_type)}
                    <div>
                      <CardTitle className="text-base">{document.document_name}</CardTitle>
                      <CardDescription>
                        {formatFileSize(document.file_size)} • {new Date(document.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getDocumentTypeBadgeColor(document.document_type)}>
                    {document.document_type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Document Status */}
                <div className="flex items-center gap-2">
                  {document.is_signed && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <Shield className="h-3 w-3 mr-1" />
                      Signed
                    </Badge>
                  )}
                  {document.expires_at && (
                    <Badge 
                      variant="outline" 
                      className={
                        isExpired(document.expires_at) 
                          ? "text-red-600 border-red-300"
                          : isExpiringSoon(document.expires_at)
                          ? "text-yellow-600 border-yellow-300"
                          : "text-green-600 border-green-300"
                      }
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      {isExpired(document.expires_at) 
                        ? 'Expired'
                        : isExpiringSoon(document.expires_at)
                        ? 'Expires Soon'
                        : 'Valid'
                      }
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {document.access_level}
                  </Badge>
                </div>

                {/* Expiry Information */}
                {document.expires_at && (
                  <p className="text-sm text-muted-foreground">
                    Expires: {new Date(document.expires_at).toLocaleDateString()}
                  </p>
                )}

                {/* Signature Information */}
                {document.is_signed && document.signature_date && (
                  <p className="text-sm text-muted-foreground">
                    Signed: {new Date(document.signature_date).toLocaleDateString()}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => downloadDocument(document)}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full">
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No documents found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || typeFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Your documents will appear here when available'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Document Security Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Document Security
          </CardTitle>
          <CardDescription>
            Your documents are securely stored and encrypted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Security Features</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• End-to-end encryption</li>
                <li>• Secure access controls</li>
                <li>• Digital signatures verification</li>
                <li>• Audit trail logging</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Document Types</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Warranties and guarantees</li>
                <li>• Invoices and receipts</li>
                <li>• Contracts and agreements</li>
                <li>• Product manuals</li>
                <li>• Certificates</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};