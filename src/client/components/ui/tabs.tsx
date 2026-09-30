import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "cn";

export function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root className={cn("w-full", className)} data-slot="tabs" {...props} />;
}

export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex h-8 w-fit items-center rounded-lg bg-black/8 p-0.5 dark:bg-white/8",
        className,
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      className={cn(
        "inline-flex h-7 min-w-0 items-center justify-center rounded-[calc(var(--radius-lg)-2px)] px-3 font-medium whitespace-nowrap text-olive-500 select-none dark:text-olive-400",
        "hover:text-olive-900 dark:hover:text-olive-100",
        "focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1",
        "data-active:bg-white data-active:text-olive-950 data-active:shadow-sm dark:data-active:bg-olive-700 dark:data-active:text-white",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      className={cn("focus-visible:outline-2 focus-visible:outline-offset-2", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}
