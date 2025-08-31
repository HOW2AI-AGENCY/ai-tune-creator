/**
 * Dynamic UI component loaders
 * These components are loaded on-demand to reduce initial bundle size
 */

import { lazy } from 'react';

// Heavy overlay components (dialogs, popovers, etc.)
export const Dialog = lazy(() => import('./dialog').then(m => ({ default: m.Dialog })));
export const DialogContent = lazy(() => import('./dialog').then(m => ({ default: m.DialogContent })));
export const DialogDescription = lazy(() => import('./dialog').then(m => ({ default: m.DialogDescription })));
export const DialogFooter = lazy(() => import('./dialog').then(m => ({ default: m.DialogFooter })));
export const DialogHeader = lazy(() => import('./dialog').then(m => ({ default: m.DialogHeader })));
export const DialogTitle = lazy(() => import('./dialog').then(m => ({ default: m.DialogTitle })));
export const DialogTrigger = lazy(() => import('./dialog').then(m => ({ default: m.DialogTrigger })));

export const Sheet = lazy(() => import('./sheet').then(m => ({ default: m.Sheet })));
export const SheetContent = lazy(() => import('./sheet').then(m => ({ default: m.SheetContent })));
export const SheetDescription = lazy(() => import('./sheet').then(m => ({ default: m.SheetDescription })));
export const SheetFooter = lazy(() => import('./sheet').then(m => ({ default: m.SheetFooter })));
export const SheetHeader = lazy(() => import('./sheet').then(m => ({ default: m.SheetHeader })));
export const SheetTitle = lazy(() => import('./sheet').then(m => ({ default: m.SheetTitle })));
export const SheetTrigger = lazy(() => import('./sheet').then(m => ({ default: m.SheetTrigger })));

export const DropdownMenu = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenu })));
export const DropdownMenuContent = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuContent })));
export const DropdownMenuItem = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuItem })));
export const DropdownMenuCheckboxItem = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuCheckboxItem })));
export const DropdownMenuRadioItem = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuRadioItem })));
export const DropdownMenuLabel = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuLabel })));
export const DropdownMenuSeparator = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuSeparator })));
export const DropdownMenuShortcut = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuShortcut })));
export const DropdownMenuGroup = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuGroup })));
export const DropdownMenuPortal = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuPortal })));
export const DropdownMenuSub = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuSub })));
export const DropdownMenuSubContent = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuSubContent })));
export const DropdownMenuSubTrigger = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuSubTrigger })));
export const DropdownMenuRadioGroup = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuRadioGroup })));
export const DropdownMenuTrigger = lazy(() => import('./dropdown-menu').then(m => ({ default: m.DropdownMenuTrigger })));

export const Popover = lazy(() => import('./popover').then(m => ({ default: m.Popover })));
export const PopoverContent = lazy(() => import('./popover').then(m => ({ default: m.PopoverContent })));
export const PopoverTrigger = lazy(() => import('./popover').then(m => ({ default: m.PopoverTrigger })));

export const Command = lazy(() => import('./command').then(m => ({ default: m.Command })));
export const CommandDialog = lazy(() => import('./command').then(m => ({ default: m.CommandDialog })));
export const CommandInput = lazy(() => import('./command').then(m => ({ default: m.CommandInput })));
export const CommandList = lazy(() => import('./command').then(m => ({ default: m.CommandList })));
export const CommandEmpty = lazy(() => import('./command').then(m => ({ default: m.CommandEmpty })));
export const CommandGroup = lazy(() => import('./command').then(m => ({ default: m.CommandGroup })));
export const CommandItem = lazy(() => import('./command').then(m => ({ default: m.CommandItem })));
export const CommandShortcut = lazy(() => import('./command').then(m => ({ default: m.CommandShortcut })));
export const CommandSeparator = lazy(() => import('./command').then(m => ({ default: m.CommandSeparator })));

// Layout components
export const Accordion = lazy(() => import('./accordion').then(m => ({ default: m.Accordion })));
export const AccordionContent = lazy(() => import('./accordion').then(m => ({ default: m.AccordionContent })));
export const AccordionItem = lazy(() => import('./accordion').then(m => ({ default: m.AccordionItem })));
export const AccordionTrigger = lazy(() => import('./accordion').then(m => ({ default: m.AccordionTrigger })));

export const Collapsible = lazy(() => import('./collapsible').then(m => ({ default: m.Collapsible })));
export const CollapsibleContent = lazy(() => import('./collapsible').then(m => ({ default: m.CollapsibleContent })));
export const CollapsibleTrigger = lazy(() => import('./collapsible').then(m => ({ default: m.CollapsibleTrigger })));

export const ScrollArea = lazy(() => import('./scroll-area').then(m => ({ default: m.ScrollArea })));
export const ScrollBar = lazy(() => import('./scroll-area').then(m => ({ default: m.ScrollBar })));

// Specialized components
export const Calendar = lazy(() => import('./calendar').then(m => ({ default: m.Calendar })));
export const Carousel = lazy(() => import('./carousel').then(m => ({ default: m.Carousel })));
export const CarouselContent = lazy(() => import('./carousel').then(m => ({ default: m.CarouselContent })));
export const CarouselItem = lazy(() => import('./carousel').then(m => ({ default: m.CarouselItem })));
export const CarouselNext = lazy(() => import('./carousel').then(m => ({ default: m.CarouselNext })));
export const CarouselPrevious = lazy(() => import('./carousel').then(m => ({ default: m.CarouselPrevious })));

export const Tooltip = lazy(() => import('./tooltip').then(m => ({ default: m.Tooltip })));
export const TooltipContent = lazy(() => import('./tooltip').then(m => ({ default: m.TooltipContent })));
export const TooltipProvider = lazy(() => import('./tooltip').then(m => ({ default: m.TooltipProvider })));
export const TooltipTrigger = lazy(() => import('./tooltip').then(m => ({ default: m.TooltipTrigger })));

export const HoverCard = lazy(() => import('./hover-card').then(m => ({ default: m.HoverCard })));
export const HoverCardContent = lazy(() => import('./hover-card').then(m => ({ default: m.HoverCardContent })));
export const HoverCardTrigger = lazy(() => import('./hover-card').then(m => ({ default: m.HoverCardTrigger })));

export const ContextMenu = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenu })));
export const ContextMenuContent = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuContent })));
export const ContextMenuItem = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuItem })));
export const ContextMenuCheckboxItem = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuCheckboxItem })));
export const ContextMenuRadioItem = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuRadioItem })));
export const ContextMenuLabel = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuLabel })));
export const ContextMenuSeparator = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuSeparator })));
export const ContextMenuShortcut = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuShortcut })));
export const ContextMenuGroup = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuGroup })));
export const ContextMenuPortal = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuPortal })));
export const ContextMenuSub = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuSub })));
export const ContextMenuSubContent = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuSubContent })));
export const ContextMenuSubTrigger = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuSubTrigger })));
export const ContextMenuRadioGroup = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuRadioGroup })));
export const ContextMenuTrigger = lazy(() => import('./context-menu').then(m => ({ default: m.ContextMenuTrigger })));

export const Menubar = lazy(() => import('./menubar').then(m => ({ default: m.Menubar })));
export const MenubarContent = lazy(() => import('./menubar').then(m => ({ default: m.MenubarContent })));
export const MenubarItem = lazy(() => import('./menubar').then(m => ({ default: m.MenubarItem })));
export const MenubarCheckboxItem = lazy(() => import('./menubar').then(m => ({ default: m.MenubarCheckboxItem })));
export const MenubarRadioItem = lazy(() => import('./menubar').then(m => ({ default: m.MenubarRadioItem })));
export const MenubarLabel = lazy(() => import('./menubar').then(m => ({ default: m.MenubarLabel })));
export const MenubarSeparator = lazy(() => import('./menubar').then(m => ({ default: m.MenubarSeparator })));
export const MenubarShortcut = lazy(() => import('./menubar').then(m => ({ default: m.MenubarShortcut })));
export const MenubarGroup = lazy(() => import('./menubar').then(m => ({ default: m.MenubarGroup })));
export const MenubarPortal = lazy(() => import('./menubar').then(m => ({ default: m.MenubarPortal })));
export const MenubarSub = lazy(() => import('./menubar').then(m => ({ default: m.MenubarSub })));
export const MenubarSubContent = lazy(() => import('./menubar').then(m => ({ default: m.MenubarSubContent })));
export const MenubarSubTrigger = lazy(() => import('./menubar').then(m => ({ default: m.MenubarSubTrigger })));
export const MenubarRadioGroup = lazy(() => import('./menubar').then(m => ({ default: m.MenubarRadioGroup })));
export const MenubarTrigger = lazy(() => import('./menubar').then(m => ({ default: m.MenubarTrigger })));
export const MenubarMenu = lazy(() => import('./menubar').then(m => ({ default: m.MenubarMenu })));

export const NavigationMenu = lazy(() => import('./navigation-menu').then(m => ({ default: m.NavigationMenu })));
export const NavigationMenuContent = lazy(() => import('./navigation-menu').then(m => ({ default: m.NavigationMenuContent })));
export const NavigationMenuItem = lazy(() => import('./navigation-menu').then(m => ({ default: m.NavigationMenuItem })));
export const NavigationMenuLink = lazy(() => import('./navigation-menu').then(m => ({ default: m.NavigationMenuLink })));
export const NavigationMenuList = lazy(() => import('./navigation-menu').then(m => ({ default: m.NavigationMenuList })));
export const NavigationMenuTrigger = lazy(() => import('./navigation-menu').then(m => ({ default: m.NavigationMenuTrigger })));
export const NavigationMenuViewport = lazy(() => import('./navigation-menu').then(m => ({ default: m.NavigationMenuViewport })));
export const NavigationMenuIndicator = lazy(() => import('./navigation-menu').then(m => ({ default: m.NavigationMenuIndicator })));

// Complex input components
export const Slider = lazy(() => import('./slider').then(m => ({ default: m.Slider })));
export const Toggle = lazy(() => import('./toggle').then(m => ({ default: m.Toggle })));
export const ToggleGroup = lazy(() => import('./toggle-group').then(m => ({ default: m.ToggleGroup })));
export const ToggleGroupItem = lazy(() => import('./toggle-group').then(m => ({ default: m.ToggleGroupItem })));

// Utility components
export const AspectRatio = lazy(() => import('./aspect-ratio').then(m => ({ default: m.AspectRatio })));

// Resizable panels (rarely used)
export const ResizablePanelGroup = lazy(() => import('./resizable').then(m => ({ default: m.ResizablePanelGroup })));
export const ResizablePanel = lazy(() => import('./resizable').then(m => ({ default: m.ResizablePanel })));
export const ResizableHandle = lazy(() => import('./resizable').then(m => ({ default: m.ResizableHandle })));