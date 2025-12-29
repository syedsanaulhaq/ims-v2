import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clock, CheckCircle, XCircle } from 'lucide-react';

const RequestsHistoryLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const categories = [
    {
      path: '/dashboard/requests-history/future',
      label: 'Future Request',
      description: 'Approved requests',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      path: '/dashboard/requests-history/rejected',
      label: 'Rejected Request',
      description: 'Rejected requests',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      path: '/dashboard/requests-history/pending',
      label: 'Pending Request',
      description: 'Requests awaiting action',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
  ];

  const isSubPage = location.pathname !== '/dashboard/requests-history';

  if (isSubPage) {
    return <Outlet />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Requests History</h1>
        <p className="text-gray-600 mt-2">
          View your request history organized by status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.path}
              className={`cursor-pointer border-2 ${category.borderColor} ${category.bgColor} transition-all hover:shadow-lg hover:scale-105`}
              onClick={() => navigate(category.path)}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <ArrowRight className="h-5 w-5" />
                      {category.label}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {category.description}
                    </p>
                  </div>
                  <Icon className={`h-8 w-8 ${category.color}`} />
                </div>
                <Button
                  className="w-full"
                  onClick={() => navigate(category.path)}
                >
                  View Requests
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RequestsHistoryLayout;
