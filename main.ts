import {
	App,
	MarkdownRenderer,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	moment,
} from "obsidian";

interface TaskInboxSettings {
	// eventType: "create" | "modify";
	inboxPath: string;
	reminderTime: string; // Format: HH:mm
	timeFormat: string; // Format: YYYYMMDDHHmmss
}

const DEFAULT_SETTINGS: TaskInboxSettings = {
	// eventType: "create",
	inboxPath: "Inbox/tasks.md",
	reminderTime: "04:00",
	timeFormat: "YYYYMMDDHHmmss",
};

export default class TaskInboxPlugin extends Plugin {
	settings: TaskInboxSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		// Set up daily reminder check
		this.app.workspace.onLayoutReady(() => {
			// Monitor file creation after workspace is ready to avoid initial file load events
			// if (this.settings.eventType === "create") {

			// } else {
			// 	this.registerEvent(
			// 		this.app.vault.on("modify", async (file) => {
			// 			if (
			// 				file instanceof TFile &&
			// 				file.path !== this.settings.inboxPath
			// 			) {
			// 				setTimeout(async () => {
			// 					await this.appendTaskToInbox(file, file.path);
			// 				}, 1000);
			// 			}
			// 		})
			// 	);
			// }
			this.registerEvent(
				this.app.vault.on("create", async (file) => {
					if (
						file instanceof TFile &&
						file.path !== this.settings.inboxPath
					) {
						setTimeout(async () => {
							await this.appendTaskToInbox(file, file.path);
						}, 1000);
					}
				})
			);

			this.setupDailyReminder();
		});

		// Add settings tab
		this.addSettingTab(new TaskInboxSettingTab(this.app, this));
	}

	async appendTaskToInbox(targetFile: TFile, filePath: string) {
		let inboxFile = this.app.vault.getAbstractFileByPath(
			this.settings.inboxPath
		);

		if (!inboxFile) {
			try {
				// Split path into folder parts and create folders if needed
				const pathParts = this.settings.inboxPath.split("/");
				const fileName = pathParts.pop(); // Remove file name
				let currentPath = "";

				// Create each folder in path if it doesn't exist
				for (const folder of pathParts) {
					currentPath += folder;
					const folderExists =
						this.app.vault.getFolderByPath(currentPath);
					if (!folderExists) {
						await this.app.vault.createFolder(currentPath);
					}
					currentPath += "/";
				}

				// Create the file after ensuring folders exist
				inboxFile = await this.app.vault.create(
					this.settings.inboxPath,
					""
				);
			} catch (error) {
				new Notice(
					`Failed to create inbox file at ${this.settings.inboxPath}`
				);
				return;
			}
		}

		if (!(inboxFile instanceof TFile)) {
			new Notice("Inbox path points to a folder, not a file");
			return;
		}

		const newTask = `- [ ] ${moment().format(
			this.settings.timeFormat
		)} ${this.app.fileManager.generateMarkdownLink(
			targetFile,
			inboxFile.path
		)}\n`;
		await this.app.vault.append(inboxFile, newTask);
	}

	setupDailyReminder() {
		// Calculate initial delay until next check time
		const getNextCheckDelay = () => {
			const now = moment();
			const [hours, minutes] = this.settings.reminderTime
				.split(":")
				.map(Number);
			const nextCheck = moment(now)
				.hours(hours)
				.minutes(minutes)
				.seconds(0)
				.milliseconds(0);

			if (nextCheck.isSameOrBefore(now)) {
				nextCheck.add(1, "days");
			}

			return nextCheck.diff(now);
		};

		const scheduleCheck = () => {
			this.registerInterval(
				window.setInterval(async () => {
					await this.checkUnfinishedTasks();
					scheduleCheck(); // Schedule next check
				}, getNextCheckDelay())
			);
		};

		scheduleCheck();
	}

	async checkUnfinishedTasks() {
		const inboxFile = this.app.vault.getAbstractFileByPath(
			this.settings.inboxPath
		);

		if (!(inboxFile instanceof TFile)) {
			new Notice(`Inbox file not found at ${this.settings.inboxPath}`);
			return;
		}

		const content = await this.app.vault.read(inboxFile);
		const unfinishedTasks = content
			.split("\n")
			.filter((line) => line.match(/^(-|\*|\d+\.)\s\[ \](.*)/));

		if (unfinishedTasks && unfinishedTasks.length > 0) {
			const newFragment = document.createDocumentFragment();

			const div = newFragment.createEl("div");

			const markdownFileContent = `
You have ${unfinishedTasks.length} unfinished tasks in your inbox!
You can click on the link below to view your inbox.
`;
			const buttonEl = newFragment.createEl("button");
			buttonEl.setText("View Inbox");
			buttonEl.onclick = (e) => {
				this.app.workspace.getLeaf("split").openFile(inboxFile);
			};
			new Notice(newFragment, 0);

			MarkdownRenderer.render(
				this.app,
				markdownFileContent,
				div,
				inboxFile.path,
				this
			);
		}
	}

	onunload() {
		// Clean up any intervals or timeouts here if needed
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class TaskInboxSettingTab extends PluginSettingTab {
	plugin: TaskInboxPlugin;

	constructor(app: App, plugin: TaskInboxPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// new Setting(containerEl)
		// 	.setName("Event type")
		// 	.setDesc("Event type to monitor for new tasks")
		// 	.addDropdown((dropdown) =>
		// 		dropdown
		// 			.addOptions({ create: "Create", modify: "Modify" })
		// 			.setValue(this.plugin.settings.eventType)
		// 			.onChange(async (value) => {
		// 				this.plugin.settings.eventType = value as
		// 					| "create"
		// 					| "modify";
		// 				await this.plugin.saveSettings();
		// 			})
		// 	);

		new Setting(containerEl)
			.setName("Inbox file path")
			.setDesc("Path to the file where new tasks will be added")
			.addText((text) =>
				text
					.setPlaceholder("Inbox/tasks.md")
					.setValue(this.plugin.settings.inboxPath)
					.onChange(async (value) => {
						this.plugin.settings.inboxPath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Reminder time")
			.setDesc(
				"Time to check for unfinished tasks (24-hour format, e.g., 04:00)"
			)
			.addText((text) =>
				text
					.setPlaceholder("04:00")
					.setValue(this.plugin.settings.reminderTime)
					.onChange(async (value) => {
						if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value)) {
							this.plugin.settings.reminderTime = value;
							await this.plugin.saveSettings();
						}
					})
			);

		new Setting(containerEl).setName("Time format").addText((text) =>
			text.setValue("YYYYMMDDHHmmss").onChange(async (value) => {
				this.plugin.settings.timeFormat = value;
				await this.plugin.saveSettings();
			})
		);
	}
}
