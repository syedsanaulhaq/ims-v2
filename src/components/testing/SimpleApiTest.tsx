import React, { useState } from 'react';
import { invmisApi } from '@/services/invmisApi';

interface TestResult {
  name: string;
  status: 'success' | 'error' | 'running';
  duration?: number;
  data?: any;
  error?: string;
  count?: number;
}

const SimpleApiTest: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    const tests = [
      { name: 'Dashboard', fn: () => invmisApi.dashboard.getSummary() },
      { name: 'Users', fn: () => invmisApi.users.getAll() },
      { name: 'Offices', fn: () => invmisApi.offices.getAll() },
      { name: 'Categories', fn: () => invmisApi.categories.getAll() },
      { name: 'Items', fn: () => invmisApi.items.getAll() },
      { name: 'Stock', fn: () => invmisApi.stock.getCurrent() },
      { name: 'Tenders', fn: () => invmisApi.tenders.getAwards() },
      { name: 'Deliveries', fn: () => invmisApi.deliveries.getAll() },
    ];

    const results: TestResult[] = [];

    for (const test of tests) {
      // Add running status
      const runningResult: TestResult = { name: test.name, status: 'running' };
      results.push(runningResult);
      setTestResults([...results]);

      try {
        const start = Date.now();
        const result = await test.fn();
        const duration = Date.now() - start;
        
        // Remove running status and add final result
        results.pop();
        
        if (result) {
          const count = getDataCount(result);
          const successResult: TestResult = {
            name: test.name,
            status: 'success',
            duration,
            data: result,
            count
          };
          results.push(successResult);
        } else {
          const errorResult: TestResult = {
            name: test.name,
            status: 'error',
            error: 'No data returned'
          };
          results.push(errorResult);
        }
      } catch (error: any) {
        // Remove running status and add error result
        results.pop();
        const errorResult: TestResult = {
          name: test.name,
          status: 'error',
          error: error.message || 'Unknown error'
        };
        results.push(errorResult);
      }
      
      setTestResults([...results]);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsRunning(false);
  };

  const getDataCount = (data: any): number => {
    if (Array.isArray(data)) return data.length;
    if (data?.users?.length) return data.users.length;
    if (data?.offices?.length) return data.offices.length;
    if (data?.categories?.length) return data.categories.length;
    if (data?.items?.length) return data.items.length;
    if (data?.stock?.length) return data.stock.length;
    if (data?.awards?.length) return data.awards.length;
    if (data?.deliveries?.length) return data.deliveries.length;
    return 1; // For dashboard summary
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>InvMIS API Test Dashboard</h1>
      <p>Test all InvMISDB API endpoints</p>
      
      <button 
        onClick={runTests} 
        disabled={isRunning}
        style={{ 
          padding: '10px 20px', 
          fontSize: '16px', 
          marginBottom: '20px',
          backgroundColor: isRunning ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isRunning ? 'not-allowed' : 'pointer'
        }}
      >
        {isRunning ? 'Running Tests...' : 'Run All API Tests'}
      </button>

      <div style={{ 
        border: '1px solid #ddd', 
        padding: '15px', 
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        minHeight: '200px'
      }}>
        <h3>Test Results:</h3>
        {testResults.map((result, index) => (
          <div key={index} style={{ 
            marginBottom: '15px', 
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: result.status === 'success' ? '#d4edda' : 
                            result.status === 'error' ? '#f8d7da' : '#fff3cd'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
              {result.status === 'success' && '✅'} 
              {result.status === 'error' && '💥'} 
              {result.status === 'running' && '🔄'} 
              {result.name}
              {result.duration && ` (${result.duration}ms)`}
            </div>
            
            {result.status === 'success' && (
              <div style={{ fontSize: '12px', color: '#155724' }}>
                <div>Status: SUCCESS</div>
                {result.count !== undefined && <div>Records: {result.count}</div>}
                {result.data && (
                  <details style={{ marginTop: '8px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      View Data Sample
                    </summary>
                    <pre style={{ 
                      marginTop: '8px', 
                      fontSize: '10px', 
                      backgroundColor: '#f8f9fa', 
                      padding: '8px', 
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '200px'
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
            
            {result.status === 'error' && (
              <div style={{ fontSize: '12px', color: '#721c24' }}>
                Error: {result.error}
              </div>
            )}
            
            {result.status === 'running' && (
              <div style={{ fontSize: '12px', color: '#856404' }}>
                Running...
              </div>
            )}
          </div>
        ))}
        
        {testResults.length === 0 && (
          <div style={{ color: '#666', fontStyle: 'italic' }}>
            Click "Run All API Tests" to start testing...
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>API Server:</strong> http://localhost:5000</p>
        <p><strong>Frontend:</strong> http://localhost:8080</p>
        <p><strong>Database:</strong> InvMISDB</p>
      </div>
    </div>
  );
};

export default SimpleApiTest;