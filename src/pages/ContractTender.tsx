import React from 'react';
import { useNavigate } from 'react-router-dom';
import TenderDashboard from '@/components/tenders/TenderDashboard';

interface ContractTenderProps {
  initialType?: 'Contract/Tender' | 'Spot Purchase';
}

const ContractTender: React.FC<ContractTenderProps> = ({ initialType }) => {
  const navigate = useNavigate();
  const isSpotPurchase = initialType === 'Spot Purchase';
  
  const handleEditTender = (tender: any) => {
    // Navigate to edit page with tender ID
    navigate(`/dashboard/tenders/${tender.id}/edit`);
  };
  
  return (
    <TenderDashboard 
      tenderTypeFilter={isSpotPurchase ? 'spot-purchase' : 'contract'}
      dashboardTitle={isSpotPurchase ? 'Spot Purchase Management' : 'Contract Tender Management'}
      onEditTender={handleEditTender}
    />
  );
};

export default ContractTender;