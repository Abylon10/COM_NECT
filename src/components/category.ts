import type { IconName } from '@/components/icon';
import { CATEGORIES, type Category } from '@/data/events';

/** Icon and cover color for each category. */
export const CategoryStyles: Record<Category, { icon: IconName; color: string }> = {
  youth: { icon: { ios: 'person.3.fill', md: 'groups' }, color: '#1F9E96' },
  educational: { icon: { ios: 'book.fill', md: 'school' }, color: '#3E7BD6' },
  sports: { icon: { ios: 'figure.run', md: 'sports_basketball' }, color: '#E07A2F' },
  cultural: { icon: { ios: 'theatermasks.fill', md: 'theater_comedy' }, color: '#A3509C' },
  volunteer: { icon: { ios: 'hands.sparkles.fill', md: 'volunteer_activism' }, color: '#3F9C5A' },
};

export function categoryLabel(category: Category) {
  return CATEGORIES.find((c) => c.id === category)?.label ?? category;
}
