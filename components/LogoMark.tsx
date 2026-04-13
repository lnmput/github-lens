import iconUrl from "url:~assets/icon.png"

import { cn } from "~lib/utils"

interface LogoMarkProps {
  alt?: string
  className?: string
  imageClassName?: string
}

export default function LogoMark({
  alt = "GitHub Lens Logo",
  className,
  imageClassName
}: LogoMarkProps) {
  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[18px] bg-[radial-gradient(circle_at_28%_24%,rgba(56,189,248,0.22),transparent_58%),linear-gradient(135deg,rgba(255,255,255,0.88),rgba(224,231,255,0.92))] p-[3px] shadow-[0_10px_24px_rgba(37,99,235,0.14)] dark:bg-[radial-gradient(circle_at_28%_24%,rgba(56,189,248,0.16),transparent_58%),linear-gradient(135deg,rgba(30,41,59,0.92),rgba(49,46,129,0.72))]",
        className
      )}>
      <div className="absolute inset-[1px] rounded-[16px] bg-white/28 dark:bg-slate-950/20" />
      <img
        alt={alt}
        className={cn(
          "relative z-10 h-[80%] w-[80%] object-contain drop-shadow-[0_1px_1px_rgba(15,23,42,0.08)]",
          imageClassName
        )}
        src={iconUrl}
      />
    </div>
  )
}
