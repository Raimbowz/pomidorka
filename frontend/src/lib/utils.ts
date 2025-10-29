import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatTime(time: string): string {
	return time;
}

export function formatDays(days: number[]): string {
	if (days.length === 7) return 'Каждый день';
	if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
		return 'Будни';
	}
	if (days.length === 2 && days.includes(0) && days.includes(6)) {
		return 'Выходные';
	}

	const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
	return days.map((d) => dayNames[d]).join(', ');
}
