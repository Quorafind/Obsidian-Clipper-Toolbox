/// <reference types="jest" />

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { App, TFile, TFolder, Notice, moment } from 'obsidian';
import { TaskManager } from '../TaskManager';

jest.mock('obsidian', () => ({
  TFile: class TFile {},
  TFolder: class TFolder {},
  Notice: jest.fn(),
  moment: () => ({
    format: jest.fn().mockReturnValue('20230101000000')
  })
}));

describe('TaskManager', () => {
  let app: App;
  let taskManager: TaskManager;
  let mockFile: TFile;
  let mockInboxFile: TFile;

  beforeEach(() => {
    app = {} as App;
    mockFile = new TFile();
    mockInboxFile = new TFile();
    app.vault = {
      getAbstractFileByPath: jest.fn(),
      create: jest.fn().mockResolvedValue(mockFile as never),
      createFolder: jest.fn(),
      append: jest.fn(),
      read: jest.fn().mockResolvedValue('' as never),
      getFolderByPath: jest.fn(),
    } as any;

    app.fileManager = {
      generateMarkdownLink: jest.fn().mockReturnValue('[[test]]'),
    } as any;

    taskManager = new TaskManager(app, 'inbox/tasks.md', 'YYYYMMDDHHmmss');
  });

  describe('appendTask', () => {
    it('should create folders if they dont exist', async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);
      (app.vault.create as jest.Mock).mockResolvedValue(mockFile as never);
      (app.vault.getFolderByPath as jest.Mock).mockReturnValue(null);

      await taskManager.appendTask(mockFile, 'test.md');

      expect(app.vault.createFolder).toHaveBeenCalledWith('inbox');
      expect(app.vault.create).toHaveBeenCalledWith('inbox/tasks.md', '');
    });

    it('should not create folders if they already exist', async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockInboxFile);
      (app.vault.getFolderByPath as jest.Mock).mockReturnValue(new TFolder());

      await taskManager.appendTask(mockFile, 'test.md');

      expect(app.vault.createFolder).not.toHaveBeenCalled();
      expect(app.vault.create).not.toHaveBeenCalled();
    });

    it('should append task with correct format', async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockInboxFile);

      await taskManager.appendTask(mockFile, 'test.md');

      expect(app.vault.append).toHaveBeenCalledWith(
        mockInboxFile,
        '- [ ] 20230101000000 [[test]]\n'
      );
    });

    it('should handle error when inbox path points to a folder', async () => {
      const mockFolder = new TFolder();
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockFolder);

      await taskManager.appendTask(mockFile, 'test.md');

      expect(Notice).toHaveBeenCalledWith("Inbox path points to a folder, not a file");
      expect(app.vault.append).not.toHaveBeenCalled();
    });
  });

  describe('getUnfinishedTasks', () => {
    it('should return unfinished tasks', async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockInboxFile);
      (app.vault.read as jest.Mock).mockImplementation(() => 
        Promise.resolve('- [ ] Task 1\n- [x] Task 2\n- [ ] Task 3\n* [ ] Task 4\n1. [ ] Task 5')
      );

      const tasks = await taskManager.getUnfinishedTasks();

      expect(tasks).toHaveLength(4);
      expect(tasks[0]).toContain('Task 1');
      expect(tasks[1]).toContain('Task 3');
      expect(tasks[2]).toContain('Task 4');
      expect(tasks[3]).toContain('Task 5');
    });

    it('should return empty array when inbox file not found', async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

      const tasks = await taskManager.getUnfinishedTasks();

      expect(Notice).toHaveBeenCalledWith('Inbox file not found at inbox/tasks.md');
      expect(tasks).toEqual([]);
    });

    it('should handle empty inbox file', async () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockInboxFile);
      (app.vault.read as jest.Mock).mockImplementation(() => Promise.resolve(''));

      const tasks = await taskManager.getUnfinishedTasks();

      expect(tasks).toEqual([]);
    });
  });

  describe('getInboxFile', () => {
    it('should return inbox file when it exists', () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockInboxFile);

      const result = taskManager.getInboxFile();

      expect(result).toBe(mockInboxFile);
    });

    it('should return null when inbox file does not exist', () => {
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(null);

      const result = taskManager.getInboxFile();

      expect(result).toBeNull();
    });

    it('should return null when inbox path points to a folder', () => {
      const mockFolder = new TFolder();
      (app.vault.getAbstractFileByPath as jest.Mock).mockReturnValue(mockFolder);

      const result = taskManager.getInboxFile();

      expect(result).toBeNull();
    });
  });
}); 
