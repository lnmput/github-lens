import {
  ExternalLink,
  FileText,
  GitBranch,
  Globe,
  Rocket,
  Wrench
} from "lucide-react"
import { t } from "~lib/i18n"
import { cn } from "~lib/utils"
import type { RecommendationResult as RecommendationResultType } from "~types"

interface RecommendationResultProps {
  result: RecommendationResultType
}

const typeConfig = {
  repo: {
    icon: GitBranch,
    label: "recommendationTypeRepository",
    fallback: "Repository",
    color: "text-slate-600 bg-slate-50 border-slate-200/50 dark:text-slate-400 dark:bg-slate-900/50 dark:border-slate-800"
  },
  app: {
    icon: Globe,
    label: "recommendationTypeWebApp",
    fallback: "Web App",
    color: "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-400 dark:bg-blue-900/30 dark:border-blue-900/50"
  },
  tool: {
    icon: Wrench,
    label: "recommendationTypeTool",
    fallback: "Tool",
    color: "text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-900/50"
  },
  article: {
    icon: FileText,
    label: "recommendationTypeArticle",
    fallback: "Article",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30 dark:border-emerald-900/50"
  }
}

export default function RecommendationResult({
  result
}: RecommendationResultProps) {
  return (
    <div className="space-y-2.5 pt-1.5 px-0.5">
      {/* Dense Discovery Stream */}
      <div className="space-y-1.5">
        {result.items.map((item, index) => {
          const config = typeConfig[item.type] || typeConfig.tool
          const Icon = config.icon

          return (
            <a
              className="group block relative overflow-hidden rounded-md border border-slate-100 bg-white/50 p-2.5 transition-all hover:border-blue-200 hover:bg-white dark:border-slate-800/50 dark:bg-slate-900/30 dark:hover:border-blue-900/40 dark:hover:bg-slate-900/60"
              href={item.url}
              key={index}
              rel="noreferrer"
              target="_blank">
              
              <div className="space-y-1.5">
                {/* Header: Number + Name + Type */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 font-mono">
                      0{index + 1}
                    </span>
                    <h5 className="text-[13px] font-extrabold text-slate-900 truncate dark:text-slate-50 group-hover:text-blue-600 transition-colors tracking-tight">
                      {item.name}
                    </h5>
                  </div>
                  <div className={cn(
                    "flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-sm border shrink-0",
                    item.type === 'repo' ? "bg-slate-50 text-slate-500 border-slate-100" :
                    item.type === 'app' ? "bg-blue-50 text-blue-500 border-blue-100" :
                    item.type === 'tool' ? "bg-amber-50 text-amber-500 border-amber-100" :
                    "bg-emerald-50 text-emerald-500 border-emerald-100"
                  )}>
                    <Icon className="h-2.5 w-2.5" />
                    {t(config.label, undefined, config.fallback)}
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                  {item.description}
                </p>

                {/* Compact Recommendation Tag */}
                <div className="flex items-center gap-1.5 bg-blue-50/50 dark:bg-blue-950/20 px-2 py-1 rounded-sm border border-blue-100/30 dark:border-blue-900/30">
                  <span className="text-[10px] scale-90 origin-left">✨</span>
                  <p className="text-[11px] font-bold text-blue-700/80 dark:text-blue-400/80 leading-none">
                    {item.whyBetter}
                  </p>
                </div>
              </div>

              {/* Hover Indicator */}
              <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between px-1.5 py-1">
        <p className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
          {t("recommendationFooterTitle", undefined, "AI RECOMMENDATIONS")}
        </p>
        <p className="text-[9px] font-black text-blue-500/50">
          Q:{result.dataQuality}
        </p>
      </div>
    </div>
  )
}
