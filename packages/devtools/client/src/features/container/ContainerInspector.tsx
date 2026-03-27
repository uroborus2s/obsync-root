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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, type ServiceInfo } from '@/lib/api';
import { Background, Controls, ReactFlow, useEdgesState, useNodesState, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useState } from 'react';

export function ContainerInspector() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [filter, setFilter] = useState('');
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await api.get<{ services: ServiceInfo[] }>('/container');
        setServices(res.data.services);
        
        // Transform services to nodes for graph view
        // Simple layout: grid or circle
        const newNodes = res.data.services.map((svc, i) => ({
          id: svc.name,
          position: { x: (i % 5) * 200, y: Math.floor(i / 5) * 100 },
          data: { label: svc.name },
          type: 'default'
        }));
        setNodes(newNodes);
        
        // Edges would require dependency info which we don't have fully yet
        setEdges([]);
      } catch (error) {
        console.error('Failed to fetch services', error);
      }
    };
    fetchServices();
  }, [setNodes, setEdges]);

  const filteredServices = services.filter(s => 
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  const getLifetimeColor = (lifetime: string) => {
    switch (lifetime) {
      case 'SINGLETON': return 'bg-purple-500';
      case 'TRANSIENT': return 'bg-yellow-500';
      case 'SCOPED': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Container Inspector</CardTitle>
        <div className="pt-4">
          <Input 
            placeholder="Filter services..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <Tabs defaultValue="list" className="h-full flex flex-col">
          <div className="px-6">
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="graph">Graph View</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="list" className="flex-1 overflow-auto p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token / Name</TableHead>
                  <TableHead>Lifetime</TableHead>
                  <TableHead>Injection Mode</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((svc, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono font-medium">{svc.name}</TableCell>
                    <TableCell>
                      <Badge className={`${getLifetimeColor(svc.lifetime)} text-white border-0`}>
                        {svc.lifetime}
                      </Badge>
                    </TableCell>
                    <TableCell>{svc.injectionMode}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          
          <TabsContent value="graph" className="flex-1 h-full min-h-[500px]">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
            >
              <Background />
              <Controls />
            </ReactFlow>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
