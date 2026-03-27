import { Check, LaptopMinimal, MoonStar, SunMedium } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/app/providers/theme-provider'

const iconMap = {
  light: SunMedium,
  dark: MoonStar,
  system: LaptopMinimal,
}

export function ThemeToggle() {
  const { cycleTheme, setTheme, theme } = useTheme()
  const Icon = iconMap[theme]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`当前主题：${theme}。点击切换主题。`}
          className='rounded-xl border-border/70 bg-background text-muted-foreground shadow-[0_1px_2px_hsl(var(--foreground)/0.04)] hover:bg-accent/70 hover:text-foreground'
          onDoubleClick={cycleTheme}
          size='icon'
          variant='outline'
        >
          <Icon className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44 rounded-2xl border-border/70 p-1.5 shadow-xl'>
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <SunMedium className='size-4' />
          浅色
          {theme === 'light' ? <Check className='ml-auto size-4' /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <MoonStar className='size-4' />
          深色
          {theme === 'dark' ? <Check className='ml-auto size-4' /> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <LaptopMinimal className='size-4' />
          跟随系统
          {theme === 'system' ? <Check className='ml-auto size-4' /> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
