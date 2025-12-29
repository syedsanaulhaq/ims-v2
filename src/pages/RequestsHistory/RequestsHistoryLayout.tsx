import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
        <h1 className="text-3xl font-bold text-gray-900">Request History:</h1>
      </div>

      <div className="space-y-3 pl-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.path}
              onClick={() => navigate(category.path)}
              className="w-full text-left flex items-center gap-3 p-4 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowRight className="h-5 w-5 text-gray-600 flex-shrink-0" />
              <div className="flex items-center gap-3">
                <Icon className={`h-6 w-6 ${category.color}`} />
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {category.label}
                  </p>
                  {category.label === 'Future Request' && (
                    <p className="text-sm text-gray-600">{category.description}</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RequestsHistoryLayout;
