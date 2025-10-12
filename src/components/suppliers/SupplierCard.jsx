
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ShieldCheck, ShieldAlert, ShieldQuestion, Mail, Phone, User, Globe, Building } from 'lucide-react';

const validationStatusConfig = {
  verified: {
    icon: ShieldCheck,
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Verified",
  },
  uncertain: {
    icon: ShieldQuestion,
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    label: "Uncertain",
  },
  potential_risk: {
    icon: ShieldAlert,
    color: "bg-red-100 text-red-800 border-red-200",
    label: "Potential Risk",
  },
  pending: {
    icon: Globe,
    color: "bg-slate-100 text-slate-800 border-slate-200",
    label: "Pending",
  },
};

const ValidationBadge = ({ status, score }) => {
    const config = validationStatusConfig[status] || validationStatusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`flex items-center gap-1.5 ${config.color}`}>
        <Icon className="w-3.5 h-3.5" />
        <span className="font-medium">{config.label}</span>
        {score !== null && score !== undefined && <span className="text-xs">({score}%)</span>}
      </Badge>
    );
};

export default function SupplierCard({ supplier, onEdit, onDelete, onValidate, onViewDetails, validatingId }) {
  const isCurrentlyValidating = validatingId === supplier.id;
  const isLocal = supplier.supplier_type === 'local';

  return (
    <Card className="flex flex-col h-full bg-white shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group">
      <CardHeader 
        className="flex flex-row items-start justify-between pb-4"
        onClick={() => onViewDetails(supplier)}
      >
        <div className="flex-1 space-y-2">
          <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
            {supplier.company_name}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {supplier.category && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700">{supplier.category}</Badge>
            )}
            <Badge variant="secondary" className={isLocal ? "bg-teal-50 text-teal-700" : "bg-purple-50 text-purple-700"}>
              <Building className="w-3 h-3 mr-1" />
              {isLocal ? 'Local' : 'International'}
            </Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onEdit(supplier)}>
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => onDelete(supplier.id)}
            >
              Delete Supplier
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      
      <CardContent 
        className="flex-grow space-y-3 text-sm"
        onClick={() => onViewDetails(supplier)}
      >
        <div className="flex items-center gap-3 text-slate-600">
          <User className="w-4 h-4 text-slate-400" />
          <span>{supplier.contact_person}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-600">
          <Mail className="w-4 h-4 text-slate-400" />
          <a 
            href={`mailto:${supplier.email}`} 
            className="hover:text-blue-600 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {supplier.email}
          </a>
        </div>
        {supplier.phone && (
          <div className="flex items-center gap-3 text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{supplier.phone}</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/70 p-4 border-t">
        <ValidationBadge
          status={isCurrentlyValidating ? 'pending' : supplier.validation_status}
          score={supplier.confidence_score}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onValidate(supplier);
          }}
          disabled={isCurrentlyValidating}
          className="w-full sm:w-auto"
        >
          {isCurrentlyValidating ? 'Validating...' : 'Validate with AI'}
        </Button>
      </CardFooter>
    </Card>
  );
}
