# Mobile Design System Documentation

## Overview
Comprehensive mobile-first design system for AI Music Platform with adaptive layouts, responsive components, and optimized user experience across all screen sizes.

## Core Mobile Components

### Layout Components

#### MobileLayout
- **File**: `src/components/mobile/MobileLayout.tsx`
- **Purpose**: Main layout wrapper for mobile pages
- **Features**:
  - Dynamic header with page-specific titles
  - Conditional navigation display
  - Safe area handling for different devices

#### MobilePageWrapper  
- **File**: `src/components/mobile/MobilePageWrapper.tsx`
- **Purpose**: Page content wrapper with consistent spacing
- **Features**:
  - Configurable padding and spacing
  - Safe area insets
  - Telegram content safety

#### MobileBottomNav
- **File**: `src/components/mobile/MobileBottomNav.tsx`
- **Purpose**: Bottom navigation with optimized performance
- **Features**:
  - React.memo optimization
  - Active route highlighting
  - Smooth animations
  - Badge support

### Interactive Components

#### MobileCard
- **File**: `src/components/mobile/MobileCard.tsx`
- **Purpose**: Flexible card component for mobile interfaces
- **Variants**: default, elevated, outlined, filled
- **Features**:
  - Touch-optimized interactions
  - Configurable padding and rounding
  - Interactive state handling

#### MobileFAB (Floating Action Button)
- **File**: `src/components/mobile/MobileFAB.tsx`
- **Purpose**: Primary action button for mobile
- **Positions**: bottom-right, bottom-center, bottom-left
- **Features**:
  - Touch-friendly size (56x56dp minimum)
  - Smooth animations
  - Multiple variants

#### MobileBottomSheet
- **File**: `src/components/mobile/MobileBottomSheet.tsx`
- **Purpose**: Modal content presentation
- **Features**:
  - Gesture-based interactions
  - Configurable height
  - Backdrop closure
  - Handle indicator

### Enhanced Components

#### EnhancedMobileCard
- **File**: `src/components/mobile/EnhancedMobileCard.tsx`
- **Purpose**: Advanced card with Telegram haptic feedback
- **Features**:
  - Haptic feedback integration
  - Enhanced touch interactions
  - Accessibility support

#### MobileOptimizedCard
- **File**: `src/components/ui/mobile-optimized-card.tsx`
- **Purpose**: Touch-optimized card with swipe gestures
- **Features**:
  - Swipe left/right actions
  - Long press detection
  - Haptic feedback
  - Mobile-specific styling

## Design System Tokens

### Mobile-Specific Variables
```css
:root {
  /* Mobile layout dimensions */
  --mobile-header-height: 64px;
  --mobile-bottom-nav-height: 64px;
  
  /* Safe area handling */
  --mobile-safe-area-top: env(safe-area-inset-top);
  --mobile-safe-area-bottom: env(safe-area-inset-bottom);
  --mobile-safe-area-left: env(safe-area-inset-left);
  --mobile-safe-area-right: env(safe-area-inset-right);
  
  /* Telegram Mini App specific */
  --tg-vh: 100vh;
  --tg-viewport-height: 100vh;
  --telegram-safe-top: 0px;
  --telegram-safe-bottom: 0px;
  --telegram-main-button-height: 72px;
}
```

### Responsive Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Layout Utilities

### Viewport Handling
```css
.mobile-viewport-height {
  height: 100vh;
  height: 100dvh; /* Dynamic viewport height */
}

.mobile-content-area {
  min-height: calc(100vh - var(--mobile-header-height) - var(--mobile-bottom-nav-height));
}
```

### Safe Area Support
```css
.safe-area-inset {
  padding-left: var(--mobile-safe-area-left);
  padding-right: var(--mobile-safe-area-right);
}

.telegram-content-safe {
  padding-top: var(--telegram-safe-top);
  padding-bottom: var(--telegram-safe-bottom);
}
```

## Touch Interactions

### Tap Feedback
```css
.tap-highlight {
  transition: transform 0.1s ease-out;
  -webkit-tap-highlight-color: transparent;
}

.tap-highlight:active {
  transform: scale(0.98);
}
```

### Hover Effects (Desktop)
```css
.hover-lift {
  transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
}

.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-card);
}
```

## Animations

### Mobile-Optimized Animations
```css
.animate-slide-in-bottom {
  animation: slideInBottom 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.animate-bounce-subtle {
  animation: bounceSubtle 0.6s ease-out;
}

.animate-scale-in {
  animation: scaleIn 0.2s ease-out;
}
```

## Accessibility

### Touch Targets
- Minimum 44px x 44px for touch targets
- 8px minimum spacing between interactive elements
- Clear focus indicators for keyboard navigation

### Screen Reader Support
- Semantic HTML structure
- ARIA labels for complex interactions
- Proper heading hierarchy

## Performance Optimizations

### Component Memoization
- React.memo for frequently re-rendered components
- Custom comparison functions for prop-based optimization
- Callback memoization with useCallback

### Bundle Optimization
- Lazy loading for non-critical components
- Code splitting at route level
- Dynamic imports for large components

## Telegram Mini App Integration

### Theme Variables
```css
:root {
  --tg-bg: var(--background);
  --tg-text: var(--foreground);
  --tg-hint: var(--muted-foreground);
  --tg-link: var(--primary);
  --tg-button: var(--primary);
  --tg-button-text: var(--primary-foreground);
}
```

### Layout Components
- `TelegramPageLayout`: Telegram-specific page wrapper
- `TelegramSection`: Section wrapper with proper spacing
- Telegram-safe area handling

## Testing Guidelines

### Mobile Testing
- Test on actual devices, not just browser dev tools
- Verify touch interactions work correctly
- Check safe area handling on different devices
- Test orientation changes

### Performance Testing
- Monitor component re-render frequency
- Verify animation performance (60fps target)
- Test on lower-end devices
- Check bundle size impact

## Usage Examples

### Basic Mobile Page
```tsx
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobilePageWrapper } from '@/components/mobile/MobilePageWrapper';
import { MobileCard } from '@/components/mobile/MobileCard';

function MobilePage() {
  return (
    <MobileLayout>
      <MobilePageWrapper>
        <MobileCard variant="elevated" padding="lg">
          <h2>Page Content</h2>
        </MobileCard>
      </MobilePageWrapper>
    </MobileLayout>
  );
}
```

### Bottom Sheet Implementation
```tsx
import { MobileBottomSheet } from '@/components/mobile/MobileBottomSheet';

function Component() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title="Sheet Title"
      height="60%"
    >
      <div>Sheet content</div>
    </MobileBottomSheet>
  );
}
```

### FAB Usage
```tsx
import { MobileFAB } from '@/components/mobile/MobileFAB';
import { Plus } from 'lucide-react';

function Component() {
  return (
    <MobileFAB
      onClick={() => console.log('FAB clicked')}
      variant="primary"
      position="bottom-right"
    >
      <Plus className="h-6 w-6" />
    </MobileFAB>
  );
}
```

## Best Practices

### Layout
1. Always use safe area utilities for screen edges
2. Maintain consistent spacing using design tokens
3. Ensure minimum touch target sizes
4. Test on various screen sizes and orientations

### Performance
1. Memoize components that re-render frequently
2. Use lazy loading for large components
3. Optimize images and assets for mobile
4. Minimize bundle size for faster loading

### Accessibility
1. Use semantic HTML elements
2. Provide proper ARIA labels
3. Ensure keyboard navigation works
4. Test with screen readers

### Design
1. Follow Material Design guidelines for touch interactions
2. Use consistent visual hierarchy
3. Maintain adequate contrast ratios
4. Provide clear visual feedback for interactions

This mobile design system ensures a consistent, performant, and accessible experience across all devices while maintaining the AI Music Platform's brand identity and functionality.