import type { Reminder, CreateReminderDto, UpdateReminderDto, ReminderStats } from './types';

const API_BASE = 'http://localhost:3000/api';

export class ReminderAPI {
	async getAll(userId: number): Promise<Reminder[]> {
		const response = await fetch(`${API_BASE}/reminders/user/${userId}`);
		if (!response.ok) throw new Error('Failed to fetch reminders');
		return response.json();
	}

	async create(dto: CreateReminderDto & { userId: number }): Promise<Reminder> {
		const response = await fetch(`${API_BASE}/reminders`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(dto)
		});
		if (!response.ok) throw new Error('Failed to create reminder');
		return response.json();
	}

	async update(id: number, dto: UpdateReminderDto): Promise<Reminder> {
		const response = await fetch(`${API_BASE}/reminders/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(dto)
		});
		if (!response.ok) throw new Error('Failed to update reminder');
		return response.json();
	}

	async delete(id: number): Promise<void> {
		const response = await fetch(`${API_BASE}/reminders/${id}`, {
			method: 'DELETE'
		});
		if (!response.ok) throw new Error('Failed to delete reminder');
	}

	async toggle(id: number): Promise<Reminder> {
		const response = await fetch(`${API_BASE}/reminders/${id}/toggle`, {
			method: 'POST'
		});
		if (!response.ok) throw new Error('Failed to toggle reminder');
		return response.json();
	}

	async getStats(userId: number): Promise<ReminderStats> {
		const response = await fetch(`${API_BASE}/reminders/user/${userId}/stats`);
		if (!response.ok) throw new Error('Failed to fetch stats');
		return response.json();
	}
}

export const reminderAPI = new ReminderAPI();
