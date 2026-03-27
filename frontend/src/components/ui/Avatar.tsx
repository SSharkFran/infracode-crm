import { cn, hashColor, initials } from '../../lib/utils';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
} as const;

export function Avatar({ name, size = 'md' }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-white/10 font-semibold text-white shadow-sm',
        sizeMap[size],
      )}
      style={{ backgroundColor: hashColor(name) }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
