import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatTime(time?: string | null): string {
	if (!time) return '—';
	return time;
}

export function formatDays(days?: number[] | null): string {
	if (!days || days.length === 0) return '—';
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

export function formatInterval(minutes?: number | null): string {
	if (!minutes) return '—';
	if (minutes < 60) return `Каждые ${minutes} мин`;
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	if (remainingMinutes === 0) return `Каждые ${hours} ч`;
	return `Каждые ${hours} ч ${remainingMinutes} мин`;
}
