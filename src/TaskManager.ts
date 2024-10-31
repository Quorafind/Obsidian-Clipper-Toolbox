import { App, TFile, moment, Notice } from "obsidian";

export class TaskManager {
  constructor(private app: App, private inboxPath: string, private timeFormat: string) {}

  async appendTask(targetFile: TFile, filePath: string): Promise<void> {
    const inboxFile = await this.getOrCreateInboxFile();
    if (!inboxFile) return;

    const newTask = this.formatTask(targetFile, inboxFile);
    await this.app.vault.append(inboxFile, newTask);
  }

  private async getOrCreateInboxFile(): Promise<TFile | null> {
    let inboxFile = this.app.vault.getAbstractFileByPath(this.inboxPath);

    if (!inboxFile) {
      try {
        inboxFile = await this.createInboxFileWithFolders();
      } catch (error) {
        new Notice(`Failed to create inbox file at ${this.inboxPath}`);
        return null;
      }
    }

    if (!(inboxFile instanceof TFile)) {
      new Notice("Inbox path points to a folder, not a file");
      return null;
    }

    return inboxFile;
  }

  private async createInboxFileWithFolders(): Promise<TFile> {
    const pathParts = this.inboxPath.split("/");
    const fileName = pathParts.pop()!;
    let currentPath = "";

    for (const folder of pathParts) {
      currentPath += folder;
      const folderExists = this.app.vault.getFolderByPath(currentPath);
      if (!folderExists) {
        await this.app.vault.createFolder(currentPath);
      }
      currentPath += "/";
    }

    return await this.app.vault.create(this.inboxPath, "");
  }

  private formatTask(targetFile: TFile, inboxFile: TFile): string {
    return `- [ ] ${moment().format(this.timeFormat)} ${
      this.app.fileManager.generateMarkdownLink(targetFile, inboxFile.path)
    }\n`;
  }

  async getUnfinishedTasks(): Promise<string[]> {
    const inboxFile = this.app.vault.getAbstractFileByPath(this.inboxPath);
    
    if (!(inboxFile instanceof TFile)) {
      new Notice(`Inbox file not found at ${this.inboxPath}`);
      return [];
    }

    const content = await this.app.vault.read(inboxFile);
    return content
      .split("\n")
      .filter((line) => line.match(/^(-|\*|\d+\.)\s\[ \](.*)/));
  }

  getInboxFile(): TFile | null {
    const inboxFile = this.app.vault.getAbstractFileByPath(this.inboxPath);
    return inboxFile instanceof TFile ? inboxFile : null;
  }
} 
