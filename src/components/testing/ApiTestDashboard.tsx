import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { invmisApi } from '@/services/invmisApi';
import { CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'idle' | 'running' | 'success' | 'failed' | 'error';
  duration?: number;
  data?: any;
  error?: string;
}

const ApiTestDashboard: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Dashboard Summary', status: 'idle' },
    { name: 'Get All Users', status: 'idle' },
    { name: 'Get All Offices', status: 'idle' },
    { name: 'Get All Categories', status: 'idle' },
    { name: 'Get All Items', status: 'idle' },
    { name: 'Get Current Stock', status: 'idle' },
    { name: 'Get Tender Awards', status: 'idle' },
    { name: 'Get All Deliveries', status: 'idle' },
  ]);

  const [isRunning, setIsRunning] = useState(false);

  const apiCalls = {
    'Dashboard Summary': () => invmisApi.dashboard.getSummary(),
    'Get All Users': () => invmisApi.users.getAll(),
    'Get All Offices': () => invmisApi.offices.getAll(),
    'Get All Categories': () => invmisApi.categories.getAll(),
    'Get All Items': () => invmisApi.items.getAll(),
    'Get Current Stock': () => invmisApi.stock.getCurrent(),
    'Get Tender Awards': () => invmisApi.tenders.getAwards(),
    'Get All Deliveries': () => invmisApi.deliveries.getAll(),
  };

  const runSingleTest = async (testName: string) => {
    const updateTest = (update: Partial<TestResult>) => {
      setTests(prev => prev.map(t => 
        t.name === testName ? { ...t, ...update } : t
      ));
    };

    updateTest({ status: 'running' });

    try {
      const startTime = Date.now();
      const result = await apiCalls[testName as keyof typeof apiCalls]();
      const duration = Date.now() - startTime;

      if (result) {
        // Check if result has success property
        const hasSuccess = 'success' in result;
        const isSuccessful = !hasSuccess || (result as any).success !== false;
        
        if (isSuccessful) {
          updateTest({ 
            status: 'success', 
            duration, 
            data: result,
            error: undefined 
          });
        } else {
          updateTest({ 
            status: 'failed', 
            error: 'API returned unsuccessful result',
            data: result 
          });
        }
      } else {
        updateTest({ 
          status: 'failed', 
          error: 'API returned no data',
          data: null 
        });
      }
    } catch (error) {
      updateTest({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    
    // Reset all tests
    setTests(prev => prev.map(t => ({ ...t, status: 'idle' as const })));

    for (const test of tests) {
      await runSingleTest(test.name);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <AlertTriangle className="h-4 w-4 text-yellow-600 animate-pulse" />;
      default:
        return <div className="h-4 w-4 border rounded-full border-gray-300" />;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>;
      case 'running':
        return <Badge className="bg-yellow-100 text-yellow-800">Running...</Badge>;
      default:
        return <Badge variant="outline">Idle</Badge>;
    }
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => ['failed', 'error'].includes(t.status)).length;
  const successRate = tests.length > 0 ? Math.round((successCount / tests.length) * 100) : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">InvMIS API Test Dashboard</h1>
          <p className="text-gray-600">Test all InvMISDB API endpoints</p>
        </div>
        <Button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          {isRunning ? 'Running Tests...' : 'Run All Tests'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate}%</div>
            <p className="text-xs text-gray-600">{successCount}/{tests.length} tests passed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Failed/Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Test Results</CardTitle>
          <CardDescription>
            Individual test results for each InvMIS API endpoint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tests.map((test, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    {test.error && (
                      <div className="text-sm text-red-600">{test.error}</div>
                    )}
                    {test.duration && (
                      <div className="text-xs text-gray-500">{test.duration}ms</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(test.status)}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runSingleTest(test.name)}
                    disabled={test.status === 'running'}
                  >
                    Test
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiTestDashboard;