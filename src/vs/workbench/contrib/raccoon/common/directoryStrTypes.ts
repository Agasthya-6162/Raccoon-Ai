import { URI } from '../../../../base/common/uri.js';

export type raccoonDirectoryItem = {
	uri: URI;
	name: string;
	isSymbolicLink: boolean;
	children: raccoonDirectoryItem[] | null;
	isDirectory: boolean;
	isGitIgnoredDirectory: false | { numChildren: number }; // if directory is gitignored, we ignore children
}
