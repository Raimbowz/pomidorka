<script lang="ts">
	import { onMount } from 'svelte';
	import { reminderAPI } from '$lib/api';
	import { formatTime, formatDays, cn } from '$lib/utils';
	import type { Reminder, CreateReminderDto } from '$lib/types';
	import { Bell, Plus, Trash2, Power } from 'lucide-svelte';

	// Временный userId для демо (в реальном приложении из авторизации)
	const userId = 1;

	let reminders = $state<Reminder[]>([]);
	let loading = $state(false);
	let showForm = $state(false);

	// Форма создания
	let formData = $state<CreateReminderDto>({
		title: '',
		description: '',
		time: '09:00',
		days: [],
		requireConfirmation: true
	});

	onMount(async () => {
		await loadReminders();
	});

	async function loadReminders() {
		loading = true;
		try {
			reminders = await reminderAPI.getAll(userId);
		} catch (error) {
			console.error('Failed to load reminders:', error);
		} finally {
			loading = false;
		}
	}

	async function handleSubmit() {
		if (!formData.title || formData.days.length === 0) {
			alert('Заполните обязательные поля');
			return;
		}

		loading = true;
		try {
			await reminderAPI.create({ ...formData, userId });
			await loadReminders();
			resetForm();
			showForm = false;
		} catch (error) {
			console.error('Failed to create reminder:', error);
			alert('Ошибка при создании напоминания');
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formData = {
			title: '',
			description: '',
			time: '09:00',
			days: [],
			requireConfirmation: true
		};
	}

	function toggleDay(day: number) {
		if (formData.days.includes(day)) {
			formData.days = formData.days.filter((d) => d !== day);
		} else {
			formData.days = [...formData.days, day].sort();
		}
	}

	async function toggleReminder(id: number) {
		loading = true;
		try {
			await reminderAPI.toggle(id);
			await loadReminders();
		} catch (error) {
			console.error('Failed to toggle reminder:', error);
		} finally {
			loading = false;
		}
	}

	async function deleteReminder(id: number) {
		if (!confirm('Удалить напоминание?')) return;

		loading = true;
		try {
			await reminderAPI.delete(id);
			await loadReminders();
		} catch (error) {
			console.error('Failed to delete reminder:', error);
		} finally {
			loading = false;
		}
	}

	const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
	<div class="container mx-auto px-4 py-8 max-w-4xl">
		<header class="mb-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<Bell class="w-8 h-8 text-primary" />
					<h1 class="text-3xl font-bold">Конструктор напоминаний</h1>
				</div>
				<button
					onclick={() => (showForm = !showForm)}
					class="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
				>
					<Plus class="w-4 h-4" />
					Создать
				</button>
			</div>
		</header>

		{#if showForm}
			<div class="bg-card p-6 rounded-xl shadow-lg mb-6 border border-border">
				<h2 class="text-xl font-semibold mb-4">Новое напоминание</h2>

				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
					<div>
						<label class="block text-sm font-medium mb-1">Название *</label>
						<input
							type="text"
							bind:value={formData.title}
							placeholder="Например: Выпить таблетку"
							class="w-full px-3 py-2 border border-input rounded-md bg-background"
							required
						/>
					</div>

					<div>
						<label class="block text-sm font-medium mb-1">Описание</label>
						<textarea
							bind:value={formData.description}
							placeholder="Дополнительная информация"
							class="w-full px-3 py-2 border border-input rounded-md bg-background"
							rows="2"
						/>
					</div>

					<div>
						<label class="block text-sm font-medium mb-1">Время *</label>
						<input
							type="time"
							bind:value={formData.time}
							class="w-full px-3 py-2 border border-input rounded-md bg-background"
							required
						/>
					</div>

					<div>
						<label class="block text-sm font-medium mb-2">Дни недели *</label>
						<div class="flex gap-2 flex-wrap">
							{#each dayNames as day, index}
								<button
									type="button"
									onclick={() => toggleDay(index)}
									class={cn(
										'px-4 py-2 rounded-lg border transition',
										formData.days.includes(index)
											? 'bg-primary text-primary-foreground border-primary'
											: 'bg-background border-input hover:border-primary'
									)}
								>
									{day}
								</button>
							{/each}
						</div>
					</div>

					<div class="flex items-center gap-2">
						<input
							type="checkbox"
							id="confirmation"
							bind:checked={formData.requireConfirmation}
							class="w-4 h-4"
						/>
						<label for="confirmation" class="text-sm">
							Требуется подтверждение выполнения
						</label>
					</div>

					<div class="flex gap-2 pt-2">
						<button
							type="submit"
							disabled={loading}
							class="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50"
						>
							Создать
						</button>
						<button
							type="button"
							onclick={() => { showForm = false; resetForm(); }}
							class="px-6 py-2 border border-input rounded-lg hover:bg-accent"
						>
							Отмена
						</button>
					</div>
				</form>
			</div>
		{/if}

		<div class="space-y-4">
			{#if loading && reminders.length === 0}
				<p class="text-center text-muted-foreground py-8">Загрузка...</p>
			{:else if reminders.length === 0}
				<div class="text-center py-12">
					<Bell class="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
					<p class="text-muted-foreground">Нет напоминаний</p>
					<p class="text-sm text-muted-foreground">Создайте первое напоминание</p>
				</div>
			{:else}
				{#each reminders as reminder}
					<div class="bg-card p-4 rounded-xl shadow border border-border">
						<div class="flex items-start justify-between gap-4">
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<h3 class="font-semibold text-lg">{reminder.title}</h3>
									{#if reminder.isActive}
										<span class="px-2 py-0.5 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
											Активно
										</span>
									{:else}
										<span class="px-2 py-0.5 text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 rounded">
											Неактивно
										</span>
									{/if}
								</div>

								{#if reminder.description}
									<p class="text-sm text-muted-foreground mb-2">{reminder.description}</p>
								{/if}

								<div class="flex items-center gap-4 text-sm">
									<span class="flex items-center gap-1">
										<span class="font-medium">Время:</span>
										{formatTime(reminder.time)}
									</span>
									<span class="flex items-center gap-1">
										<span class="font-medium">Дни:</span>
										{formatDays(reminder.days)}
									</span>
								</div>

								<div class="text-xs text-muted-foreground mt-1">
									{reminder.requireConfirmation ? '✓' : '○'} С подтверждением
								</div>
							</div>

							<div class="flex gap-2">
								<button
									onclick={() => toggleReminder(reminder.id)}
									class="p-2 rounded-lg border border-input hover:bg-accent transition"
									title={reminder.isActive ? 'Выключить' : 'Включить'}
								>
									<Power class="w-4 h-4" />
								</button>
								<button
									onclick={() => deleteReminder(reminder.id)}
									class="p-2 rounded-lg border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition"
									title="Удалить"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
