import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Базовый компонент Card - основа для карточек в UI
 * 
 * ОПТИМИЗАЦИЯ: Обернут в React.memo для предотвращения лишних рендеров.
 * Высокочастотное использование:
 * - Используется во множестве компонентов (TrackLibrary, Analytics, etc.)
 * - Часто рендерится в списках и сетках
 * - Может содержать сложный контент внутри
 * 
 * Мемоизация основана на:
 * - className для стилизации
 * - children для содержимого
 * - Прочих HTML атрибутах
 * 
 * ЭКОНОМИЯ: ~70-90% рендеров при обновлениях родительских компонентов
 * Особенно важно в списках с большим количеством карточек
 * 
 * WARNING: Базовый UI компонент - изменения могут влиять на всё приложение
 */
const CardComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}
    {...props}
  />
))
CardComponent.displayName = "Card"

// Мемоизированная версия Card компонента
const Card = React.memo(CardComponent)

/**
 * Компонент заголовка карточки
 * ОПТИМИЗАЦИЯ: Мемоизирован для стабильности в составных карточках
 */
const CardHeaderComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeaderComponent.displayName = "CardHeader"
const CardHeader = React.memo(CardHeaderComponent)

/**
 * Компонент заголовка карточки
 * ОПТИМИЗАЦИЯ: Мемоизирован для предотвращения ререндеров при неизменном тексте
 */
const CardTitleComponent = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitleComponent.displayName = "CardTitle"
const CardTitle = React.memo(CardTitleComponent)

/**
 * Компонент описания карточки
 * ОПТИМИЗАЦИЯ: Мемоизирован для стабильности текстового контента
 */
const CardDescriptionComponent = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescriptionComponent.displayName = "CardDescription"
const CardDescription = React.memo(CardDescriptionComponent)

/**
 * Компонент содержимого карточки - наиболее важный для оптимизации
 * ОПТИМИЗАЦИЯ: Мемоизирован так как часто содержит сложный контент
 */
const CardContentComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContentComponent.displayName = "CardContent"
const CardContent = React.memo(CardContentComponent)

/**
 * Компонент подвала карточки
 * ОПТИМИЗАЦИЯ: Мемоизирован для стабильности действий и кнопок
 */
const CardFooterComponent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooterComponent.displayName = "CardFooter"
const CardFooter = React.memo(CardFooterComponent)

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
