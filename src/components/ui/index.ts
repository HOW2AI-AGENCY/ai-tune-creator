/**
 * Selective UI components barrel export
 * Only exports components that are used frequently across the app
 * Heavy or rarely used components should be imported directly
 */

// Core components used in most pages
export { Button } from './button';
export { Input } from './input';
export { Label } from './label';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

// Form components
export { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, useFormField } from './form';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { Checkbox } from './checkbox';
export { RadioGroup, RadioGroupItem } from './radio-group';
export { Switch } from './switch';
export { Textarea } from './textarea';

// Layout components
export { Separator } from './separator';
export { Skeleton } from './skeleton';
export { Badge } from './badge';
export { Avatar, AvatarFallback, AvatarImage } from './avatar';

// Navigation
export { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

// Feedback
export { Alert, AlertDescription, AlertTitle } from './alert';
export { Progress } from './progress';
export { Spinner } from './spinner';

// Utility exports
export { cn } from '@/lib/utils';

/**
 * Heavy components that should be dynamically imported:
 * - Dialog (only when needed for modals)
 * - DropdownMenu (only when needed)
 * - Popover (only when needed)
 * - Sheet (only when needed)
 * - Command (only for command palette)
 * - Calendar (only when needed)
 * - Carousel (only when needed)
 * - ScrollArea (only when needed)
 * - Tooltip (only when needed)
 * - Toast/Sonner (loaded at app level)
 * - Menubar (rarely used)
 * - NavigationMenu (rarely used)
 * - HoverCard (rarely used)
 * - ContextMenu (rarely used)
 * - Accordion (only when needed)
 * - Collapsible (only when needed)
 * - Toggle/ToggleGroup (rarely used)
 * - Slider (only in specific contexts)
 * - AspectRatio (only when needed)
 * - ResizablePanels (only in specific layouts)
 */