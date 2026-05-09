import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
}

export function Logo({ className }: LogoProps) {
  return (
    <span
      className={cn(
        'text-light-1 font-[\'Inter\',system-ui,sans-serif] font-extrabold tracking-tight',
        className
      )}
    >
      Blackbook
    </span>
  )
}
