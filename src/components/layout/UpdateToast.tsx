import { AnimatePresence, motion } from "motion/react";
import { ArrowDownCircle, LoaderCircle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { UpdateCheckerResult } from "@/lib/updater";

interface UpdateToastProps {
  update: UpdateCheckerResult;
}

export function UpdateToast({ update }: UpdateToastProps) {
  const isVisible = update.available && !update.dismissed;

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.aside
          className="pointer-events-auto fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)]"
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <Card className="border-border/70 bg-card/95 shadow-sm">
            <CardHeader className="space-y-3 border-b border-border/60 pb-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                  {update.installing ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Update ready</Badge>
                    <Badge variant="secondary">v{update.latest}</Badge>
                  </div>
                  <CardTitle className="text-base font-medium">Cortex Metagen update available</CardTitle>
                  <p className="text-xs leading-5 text-muted-foreground">
                    {update.installing ? `Installing update… ${update.progressPercent}%` : update.statusNote}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-4">
              {update.notes ? (
                <div className="rounded-xl border border-border/60 bg-muted/25 p-3 text-xs leading-5 text-muted-foreground">
                  <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-foreground">Release notes</p>
                  <p className="whitespace-pre-wrap">{update.notes}</p>
                </div>
              ) : null}

              {update.installing ? (
                <div className="space-y-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-200"
                      style={{ width: `${Math.max(update.progressPercent, 4)}%` }}
                    />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    Download progress {update.progressPercent}%
                  </p>
                </div>
              ) : null}

              {update.error ? <p className="text-xs text-destructive">{update.error}</p> : null}
            </CardContent>

            <CardFooter className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-4">
              <Button
                disabled={update.installing}
                onClick={() => {
                  void update.install();
                }}
              >
                {update.installing ? (
                  <>
                    <LoaderCircle className="mr-1.5 size-3.5 animate-spin" />
                    Installing
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="mr-1.5 size-3.5" />
                    Install update
                  </>
                )}
              </Button>

              <Button variant="ghost" disabled={update.installing} onClick={update.dismiss}>
                Not now
              </Button>
            </CardFooter>
          </Card>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
