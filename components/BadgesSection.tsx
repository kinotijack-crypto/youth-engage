"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/types/badges";

interface Props {
  earnedBadges: (Badge & { earned_at: string })[];
}

export function BadgesSection({ earnedBadges }: Props) {
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🏅 Badges
          <span className="text-sm font-normal text-muted-foreground">
            ({earnedBadges.length} earned)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {earnedBadges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Complete actions (ask questions, answer, play trivia) to earn your first badge!
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {earnedBadges.map((badge) => (
              <TooltipProvider key={badge.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-200 dark:border-violet-800 hover:scale-105 transition-transform cursor-default">
                      <span className="text-3xl mb-1">{badge.icon}</span>
                      <span className="text-xs font-medium text-center line-clamp-2">
                        {badge.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {badge.description}
                    </p>
                    <p className="text-xs mt-2 opacity-70">
                      Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}