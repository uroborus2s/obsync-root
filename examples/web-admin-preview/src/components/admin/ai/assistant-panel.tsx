import { Bot, PanelRightClose, RotateCcw, Sparkles } from 'lucide-react';
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useThreadRuntime
} from '@assistant-ui/react';

import { Thread } from '@/components/assistant-ui/thread';
import {
  mockAssistantChatModel,
  mockAssistantSuggestions
} from '@/components/admin/ai/mock-runtime';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AssistantPanelProps {
  onClose?: () => void;
}

export function AssistantPanel({ onClose }: AssistantPanelProps) {
  const runtime = useLocalRuntime(mockAssistantChatModel, {
    adapters: {
      suggestion: {
        generate: async () => mockAssistantSuggestions
      }
    }
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <AssistantPanelShell onClose={onClose} />
    </AssistantRuntimeProvider>
  );
}

function AssistantPanelShell({ onClose }: AssistantPanelProps) {
  const runtime = useThreadRuntime();

  return (
    <div className='bg-background flex h-full flex-col'>
      <div className='border-border/70 flex min-h-20 items-center gap-3 border-b px-4'>
        <div className='flex min-w-0 flex-1 items-start gap-3'>
          <div className='bg-primary/10 text-primary mt-0.5 flex size-10 items-center justify-center rounded-2xl'>
            <Bot />
          </div>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='font-medium'>AI Copilot</p>
              <Badge variant='secondary'>
                <Sparkles data-icon='inline-start' />
                Mock runtime
              </Badge>
            </div>
            <p className='text-muted-foreground mt-1 text-sm'>
              assistant-ui thread surface wired into the admin workbench, ready
              for a real model adapter.
            </p>
          </div>
        </div>

        <Button onClick={() => runtime.reset()} size='sm' variant='outline'>
          <RotateCcw data-icon='inline-start' />
          New thread
        </Button>

        {onClose ? (
          <Button
            aria-label='Close AI workbench'
            onClick={onClose}
            size='icon'
            variant='ghost'
          >
            <PanelRightClose />
          </Button>
        ) : null}
      </div>

      <div className='min-h-0 flex-1'>
        <Thread />
      </div>
    </div>
  );
}
