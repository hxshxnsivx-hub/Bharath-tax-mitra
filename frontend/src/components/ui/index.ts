/**
 * Design-system barrel (OPT-UI.1).
 *
 * Copy-in shadcn/ui components on Radix primitives. Global constraints
 * (tasks.md Module OPT-UI): <500KB initial budget, self-hosted assets only,
 * prefers-reduced-motion honoured, WCAG 2.1 AA.
 *
 * Adoption is incremental — import from '@/components/ui' in new/touched
 * code; do not mass-rewrite working components.
 */

export { Button, buttonVariants, type ButtonProps } from './button';
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './accordion';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';
