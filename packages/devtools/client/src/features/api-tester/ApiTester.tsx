import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { Play } from 'lucide-react';
import { useState } from 'react';
import { JsonView, allExpanded, darkStyles } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';

export function ApiTester() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [body, setBody] = useState('{\n  \n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [duration, setDuration] = useState<number | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);
    setDuration(null);
    
    const startTime = performance.now();
    
    try {
      let data = undefined;
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        try {
          data = JSON.parse(body);
        } catch (e) {
          alert('Invalid JSON body');
          setLoading(false);
          return;
        }
      }

      const res = await axios({
        method,
        url,
        data,
        validateStatus: () => true // Don't throw on error status
      });

      setResponse(res.data);
      setStatus(res.status);
    } catch (error: any) {
      setResponse({ error: error.message });
    } finally {
      setDuration(Math.round(performance.now() - startTime));
      setLoading(false);
    }
  };

  const getStatusColor = (s: number | null) => {
    if (!s) return 'text-gray-500';
    if (s >= 200 && s < 300) return 'text-green-500';
    if (s >= 300 && s < 400) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="grid grid-rows-[auto_1fr] gap-4 h-full">
      {/* Request Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
            <Input 
              placeholder="Enter URL (e.g. /api/users)" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 font-mono"
            />
            <Button onClick={handleSend} disabled={loading}>
              <Play size={16} className="mr-2" />
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </div>

          <Tabs defaultValue="body">
            <TabsList>
              <TabsTrigger value="params">Params</TabsTrigger>
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="body">Body</TabsTrigger>
            </TabsList>
            <TabsContent value="body">
              <Textarea 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono min-h-[150px]"
                placeholder="JSON Body"
              />
            </TabsContent>
            <TabsContent value="params">
              <div className="text-muted-foreground text-sm p-4">Query params editor coming soon...</div>
            </TabsContent>
            <TabsContent value="headers">
              <div className="text-muted-foreground text-sm p-4">Headers editor coming soon...</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Section */}
      <Card className="overflow-hidden flex flex-col">
        <CardHeader className="py-3 bg-muted/50 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Response</CardTitle>
          {status && (
            <div className="flex gap-4 text-sm font-mono">
              <span className={getStatusColor(status)}>Status: {status}</span>
              <span className="text-muted-foreground">Time: {duration}ms</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-0">
          {response ? (
            <div className="p-4">
              <JsonView 
                data={response} 
                shouldExpandNode={allExpanded} 
                style={darkStyles} 
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No response yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
