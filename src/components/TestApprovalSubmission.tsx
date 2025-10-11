import React, { useState } from 'react';
import { approvalForwardingService } from '../services/approvalForwardingService';

interface TestApprovalSubmissionProps {
  onSubmissionComplete?: () => void;
}

export const TestApprovalSubmission: React.FC<TestApprovalSubmissionProps> = ({ 
  onSubmissionComplete 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestId, setRequestId] = useState('123');
  const [requestType, setRequestType] = useState('stock_issuance');

  const handleTestSubmission = async () => {
    setIsSubmitting(true);
    try {
      console.log('🧪 Testing approval submission...');
      
      const result = await approvalForwardingService.submitForApproval(
        requestId,
        requestType,
        'D806EC95-FB78-4187-8FC2-87B897C124A4' // Stock Issuance Approval workflow
      );
      
      console.log('✅ Test submission successful:', result);
      alert(`Test approval submitted successfully! Approval ID: ${result.id}`);
      onSubmissionComplete?.();
    } catch (error) {
      console.error('❌ Test submission failed:', error);
      alert(`Test submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg font-semibold text-yellow-800 mb-4">
        🧪 Test Approval Submission
      </h3>
      <p className="text-yellow-700 mb-4">
        Use this to test the approval workflow system by creating a test approval request.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-yellow-800 mb-1">
            Request ID
          </label>
          <input
            type="text"
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            placeholder="Enter a test request ID"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-yellow-800 mb-1">
            Request Type
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="w-full px-3 py-2 border border-yellow-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="stock_issuance">Stock Issuance</option>
            <option value="tender">Tender</option>
            <option value="procurement">Procurement</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <button
          onClick={handleTestSubmission}
          disabled={isSubmitting || !requestId.trim()}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting Test...' : 'Submit Test Approval'}
        </button>
      </div>
    </div>
  );
};

export default TestApprovalSubmission;