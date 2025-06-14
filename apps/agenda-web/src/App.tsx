import React from 'react';
import { AppSidebar } from './components/AppSidebar';
import { TaskManagement } from './components/TaskManagement';
import { Separator } from './components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger
} from './components/ui/sidebar';

function App() {
  const [activeView, setActiveView] = React.useState('#tasks');

  const renderContent = () => {
    switch (activeView) {
      case '#tasks':
        return <TaskManagement />;
      // case '#stats':
      //   return (
      //     <div className='flex h-full items-center justify-center'>
      //       <div className='text-center'>
      //         <h2 className='mb-2 text-2xl font-semibold'>统计分析</h2>
      //         <p className='text-muted-foreground'>统计分析功能即将推出</p>
      //       </div>
      //     </div>
      //   );
      // case '#settings':
      //   return (
      //     <div className='flex h-full items-center justify-center'>
      //       <div className='text-center'>
      //         <h2 className='mb-2 text-2xl font-semibold'>设置</h2>
      //         <p className='text-muted-foreground'>设置功能即将推出</p>
      //       </div>
      //     </div>
      //   );
      default:
        return (
          <div className='flex h-full items-center justify-center'>
            <div className='text-center'>
              <h2 className='mb-2 text-2xl font-semibold'>
                欢迎使用 AgendaEdu
              </h2>
              <p className='text-muted-foreground'>课表应用管理和任务监控</p>
            </div>
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className='flex h-screen w-full'>
        <AppSidebar
          activeItem={activeView}
          onItemClick={(url) => {
            setActiveView(url);
          }}
        />
        <SidebarInset className='flex flex-1 flex-col'>
          <header className='flex h-16 shrink-0 items-center gap-2 border-b px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator orientation='vertical' className='mr-2 h-4' />
            <div className='flex items-center gap-2'>
              <h1 className='text-lg font-semibold'>
                {activeView === '#tasks' && '任务管理'}
                {activeView === '#stats' && '统计分析'}
                {activeView === '#settings' && '设置'}
                {activeView === '#' && '首页'}
              </h1>
            </div>
          </header>
          <main className='flex-1 overflow-auto p-6'>{renderContent()}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

export default App;
