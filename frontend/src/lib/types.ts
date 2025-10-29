export interface Reminder {
	id: number;
	userId: number;
	title: string;
	description?: string;
	time: string; // HH:mm
	days: number[]; // 0-6 (Sunday-Saturday)
	requireConfirmation: boolean;
	isActive: boolean;
	nextScheduledAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateReminderDto {
	title: string;
	description?: string;
	time: string;
	days: number[];
	requireConfirmation?: boolean;
}

export interface UpdateReminderDto {
	title?: string;
	description?: string;
	time?: string;
	days?: number[];
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
