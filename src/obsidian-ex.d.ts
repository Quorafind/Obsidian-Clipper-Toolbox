import "obsidian";

declare module "obsidian" {
	interface App {
		plugins: {
			plugins: Record<string, any>;
		};
	}
}
