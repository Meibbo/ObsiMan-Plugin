import { FuzzySuggestModal, type App, type TFile } from 'obsidian';

type FileChooseHandler = (file: TFile) => void;

class VaultmanFileSuggestModal extends FuzzySuggestModal<TFile> {
	private readonly onChoose: FileChooseHandler;

	constructor(app: App, onChoose: FileChooseHandler) {
		super(app);
		this.onChoose = onChoose;
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file);
	}
}

export function openVaultmanFileSuggestModal(app: App, onChoose: FileChooseHandler): void {
	new VaultmanFileSuggestModal(app, onChoose).open();
}
