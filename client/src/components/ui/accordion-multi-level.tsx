import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { ChevronDown, MinusIcon, PlusIcon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface CollapsibleItemData {
  id: string;
  title: string;
  content: string;
}

export interface AccordionSectionData {
  id: string;
  title: string;
  icon: LucideIcon;
  textColor: string;
  bgColor: string;
  collapsibles: CollapsibleItemData[];
}

interface AccordionMultiLevelProps {
  items: AccordionSectionData[];
  defaultOpen?: string[];
  className?: string;
}

export default function AccordionMultiLevel({ items, defaultOpen, className }: AccordionMultiLevelProps) {
  return (
    <div className={cn("w-full", className)}>
      <Accordion
        className="w-full -space-y-1"
        defaultValue={defaultOpen || (items.length > 0 ? [items[0].id] : [])}
        type="multiple"
      >
        {items.map((item) => (
          <AccordionItem
            className="overflow-hidden border bg-background first:rounded-t-lg last:rounded-b-lg last:border-b"
            key={item.id}
            value={item.id}
          >
            <AccordionTrigger className="group px-4 py-3 hover:no-underline last:[&>svg]:hidden">
              <div className="flex w-full items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2.5 rounded-xl",
                      item.bgColor,
                      item.textColor
                    )}
                  >
                    <item.icon size={20} className="size-5" />
                  </div>
                  <span className="flex-1 text-left font-semibold">{item.title}</span>
                </div>
                <div className="relative size-4 shrink-0">
                  <PlusIcon className="absolute inset-0 size-4 text-muted-foreground transition-opacity duration-200 group-data-[panel-open]:opacity-0" />
                  <MinusIcon className="absolute inset-0 size-4 text-muted-foreground opacity-0 transition-opacity duration-200 group-data-[panel-open]:opacity-100" />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
              {item.collapsibles.map((collapsible) => (
                <Collapsible
                  className="space-y-1 border-t border-border bg-accent px-4 py-3"
                  key={collapsible.id}
                >
                  <CollapsibleTrigger className="flex items-center gap-2 font-medium [&[data-state=open]>svg]:rotate-180">
                    <ChevronDown
                      aria-hidden="true"
                      className="shrink-0 opacity-60 transition-transform duration-200"
                      size={16}
                      strokeWidth={2}
                    />
                    {collapsible.title}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden ps-6 text-sm text-muted-foreground transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    {collapsible.content}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
