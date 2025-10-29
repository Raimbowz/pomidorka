export enum ReminderType {
	SCHEDULE = 'schedule',
	INTERVAL = 'interval'
}

export interface Reminder {
	id: number;
	userId: number;
	title: string;
	description?: string;
	reminderType: ReminderType;
	// Для SCHEDULE типа:
	time?: string | null; // HH:mm
	days?: number[] | null; // 0-6 (Sunday-Saturday)
	// Для INTERVAL типа:
	intervalMinutes?: number | null;
	requireConfirmation: boolean;
	isActive: boolean;
	nextScheduledAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateReminderDto {
	title: string;
	description?: string;
	reminderType?: ReminderType;
	// Для SCHEDULE типа:
	time?: string;
	days?: number[];
	// Для INTERVAL типа:
	intervalMinutes?: number;
	requireConfirmation?: boolean;
}

export interface UpdateReminderDto {
	title?: string;
	description?: string;
	reminderType?: ReminderType;
	time?: string;
	days?: number[];
	intervalMinutes?: number;
	requireConfirmation?: boolean;
	isActive?: boolean;
}

export interface ReminderStats {
	total: number;
	active: number;
	completed: number;
	postponed: number;
	cancelled: number;
}
