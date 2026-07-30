import GenesysTokenDocument from '@/token/GenesysTokenDocument';

export function register() {
	(CONFIG.Token as any).documentClass = GenesysTokenDocument;
}
