import { QuickPreset } from '../types';

export const quickPresets: QuickPreset[] = [
  {
    id: 'pop-hit',
    name: 'Поп-хит',
    description: 'Современная поп-песня с запоминающимся припевом',
    icon: '🎤',
    genre: 'поп',
    mood: 'энергичное',
    prompt: 'Создай современную поп-песню с ярким вокалом, запоминающимся припевом и танцевальным битом. Используй синтезаторы и современное звучание.',
    tags: ['поп', 'энергичное', 'современное', 'танцевальное'],
    service: 'suno'
  },
  {
    id: 'rock-anthem',
    name: 'Рок-гимн',
    description: 'Мощная рок-композиция с электрогитарами',
    icon: '🎸',
    genre: 'рок',
    mood: 'агрессивное',
    prompt: 'Создай мощную рок-композицию с яркими электрогитарными риффами, энергичными барабанами и драйвовым вокалом. Стиль альтернативного рока.',
    tags: ['рок', 'агрессивное', 'электрогитары', 'драйв'],
    service: 'suno'
  },
  {
    id: 'chill-ambient',
    name: 'Chill Ambient',
    description: 'Спокойная атмосферная композиция для релакса',
    icon: '🌊',
    genre: 'электронная музыка',
    mood: 'спокойное',
    prompt: 'Создай спокойную атмосферную композицию в стиле ambient с мягкими синтезаторными падами, нежными мелодиями и расслабляющим темпом.',
    tags: ['электронная', 'спокойное', 'ambient', 'релакс'],
    service: 'mureka'
  },
  {
    id: 'hip-hop-beat',
    name: 'Хип-хоп бит',
    description: 'Современный хип-хоп трек с жирными басами',
    icon: '🎧',
    genre: 'хип-хоп',
    mood: 'энергичное',
    prompt: 'Создай современный хип-хоп трек с мощными басами, характерными drums и стильными семплами. Добавь атмосферные элементы.',
    tags: ['хип-хоп', 'энергичное', 'басы', 'современное'],
    service: 'suno'
  },
  {
    id: 'acoustic-ballad',
    name: 'Акустическая баллада',
    description: 'Нежная баллада с акустической гитарой',
    icon: '🎼',
    genre: 'фолк',
    mood: 'романтичное',
    prompt: 'Создай нежную акустическую балладу с мягким вокалом, красивой гитарной партией и эмоциональной мелодией. Интимное звучание.',
    tags: ['фолк', 'романтичное', 'акустика', 'баллада'],
    service: 'suno'
  },
  {
    id: 'electronic-dance',
    name: 'Electronic Dance',
    description: 'Танцевальная электронная музыка',
    icon: '💫',
    genre: 'электронная музыка',
    mood: 'веселое',
    prompt: 'Создай энергичный танцевальный electronic трек с пульсирующими басами, яркими синтезаторами и драйвовым ритмом для танцпола.',
    tags: ['электронная', 'веселое', 'танцевальное', 'энергия'],
    service: 'mureka'
  },
  {
    id: 'jazz-smooth',
    name: 'Smooth Jazz',
    description: 'Мягкий джаз с саксофоном',
    icon: '🎷',
    genre: 'джаз',
    mood: 'мечтательное',
    prompt: 'Создай мягкую джазовую композицию с выразительным саксофоном, нежным пианино и расслабленным ритмом в стиле smooth jazz.',
    tags: ['джаз', 'мечтательное', 'саксофон', 'smooth'],
    service: 'suno'
  },
  {
    id: 'classical-orchestral',
    name: 'Классический оркестр',
    description: 'Оркестровая классическая композиция',
    icon: '🎻',
    genre: 'классика',
    mood: 'драматичное',
    prompt: 'Создай красивую оркестровую композицию с струнными, духовыми инструментами и выразительной мелодией в классическом стиле.',
    tags: ['классика', 'драматичное', 'оркестр', 'красота'],
    service: 'mureka'
  }
];

export const tempoOptions = [
  { value: 'very-slow', label: 'Очень медленно (60-70 BPM)' },
  { value: 'slow', label: 'Медленно (70-90 BPM)' },
  { value: 'moderate', label: 'Умеренно (90-120 BPM)' },
  { value: 'fast', label: 'Быстро (120-140 BPM)' },
  { value: 'very-fast', label: 'Очень быстро (140+ BPM)' }
];

export const durationOptions = [
  { value: 30, label: '30 секунд' },
  { value: 60, label: '1 минута' },
  { value: 120, label: '2 минуты' },
  { value: 180, label: '3 минуты' },
  { value: 240, label: '4 минуты' }
];

export const voiceStyles = [
  { value: 'male-pop', label: 'Мужской поп' },
  { value: 'female-pop', label: 'Женский поп' },
  { value: 'male-rock', label: 'Мужской рок' },
  { value: 'female-rock', label: 'Женский рок' },
  { value: 'male-rap', label: 'Мужской рэп' },
  { value: 'female-rap', label: 'Женский рэп' },
  { value: 'choir', label: 'Хор' },
  { value: 'none', label: 'Инструментальная' }
];

export const languages = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'Английский' },
  { value: 'auto', label: 'Автоопределение' }
];