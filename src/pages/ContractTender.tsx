import React from 'react';
import TenderDashboard from '@/components/tenders/TenderDashboard';

interface ContractTenderProps {
  initialType?: 'Contract/Tender' | 'Spot Purchase';
}

const ContractTender: React.FC<ContractTenderProps> = ({ initialType }) => {
  return <TenderDashboard />;
};

export default ContractTender;