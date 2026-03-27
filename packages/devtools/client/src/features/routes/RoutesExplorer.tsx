import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { api, type RouteInfo } from '@/lib/api';
import { useEffect, useState } from 'react';

export function RoutesExplorer() {
  const [routes, setRoutes] = useState<RouteInfo[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await api.get<{ routes: RouteInfo[] }>('/routes');
        setRoutes(res.data.routes);
      } catch (error) {
        console.error('Failed to fetch routes', error);
      }
    };
    fetchRoutes();
  }, []);

  const filteredRoutes = routes.filter(r => 
    r.url.toLowerCase().includes(filter.toLowerCase()) ||
    r.method.toLowerCase().includes(filter.toLowerCase())
  );

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-blue-500 hover:bg-blue-600';
      case 'POST': return 'bg-green-500 hover:bg-green-600';
      case 'PUT': return 'bg-orange-500 hover:bg-orange-600';
      case 'DELETE': return 'bg-red-500 hover:bg-red-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Route Explorer</CardTitle>
        <div className="pt-4">
          <Input 
            placeholder="Filter routes..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Method</TableHead>
              <TableHead>Path</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoutes.map((route, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Badge className={`${getMethodColor(route.method)} text-white border-0`}>
                    {route.method}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">{route.url}</TableCell>
              </TableRow>
            ))}
            {filteredRoutes.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No routes found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
