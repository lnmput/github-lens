import { BookOpen, Rocket, Target, Terminal, Zap } from "lucide-react"
import { cn } from "~lib/utils"
import type { SummaryResult as SummaryResultType } from "~types"

interface SummaryResultProps {
  result: SummaryResultType
}

export default function SummaryResult({
  result
}: SummaryResultProps) {
  return (
    <div className="space-y-3">
      {/* One Liner */}
      <section className="relative overflow-hidden rounded-md border border-border/40 bg-background/40 p-3 shadow-sm transition-all hover:bg-background/60">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">1</div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Core Insight
          </p>
        </div>
        <p className="text-[13px] font-medium leading-relaxed text-foreground/90">
          {result.oneLiner}
        </p>
      </section>

      {/* Tech Stack */}
      <section className="rounded-md border border-border/40 bg-background/40 p-3 shadow-sm transition-all hover:bg-background/60">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">2</div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Tech Stack
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {result.techStack.map((item) => (
            <span
              className="inline-flex items-center rounded-md border border-indigo-100 bg-indigo-50/50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:border-indigo-900/30 dark:bg-indigo-950/20 dark:text-indigo-300"
              key={item}>
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* Target Audience */}
      <section className="rounded-md border border-border/40 bg-background/40 p-3 shadow-sm transition-all hover:bg-background/60">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600 dark:bg-rose-900/40 dark:text-rose-400">3</div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Target Audience
          </p>
        </div>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          {result.targetUsers}
        </p>
      </section>

      {/* Highlights */}
      <section className="rounded-md border border-border/40 bg-background/40 p-3 shadow-sm transition-all hover:bg-background/60">
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-600 dark:bg-amber-900/40 dark:text-amber-400">4</div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Key Highlights
          </p>
        </div>
        <ul className="space-y-1.5">
          {result.highlights.map((item) => (
            <li className="flex items-start gap-2" key={item}>
              <div className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
              <span className="text-[12px] leading-snug text-foreground/80">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Activity Status */}
      <section className="rounded-md border border-border/40 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 p-3 dark:from-blue-950/10 dark:to-indigo-950/10 transition-all">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">5</div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Project Health
              </p>
            </div>
            <span className="rounded-full bg-blue-100/50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {result.activeStatus}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-blue-100/50 pt-2 dark:border-blue-900/30">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">Expert Suggestion</p>
            <span className={cn(
              "rounded-md px-1.5 py-0.5 text-[11px] font-bold",
              result.recommendation === "Worth Watching" || result.recommendation === "值得关注" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" :
              result.recommendation === "Use with Caution" || result.recommendation === "谨慎使用" ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" :
              "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
            )}>
              {result.recommendation}
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
