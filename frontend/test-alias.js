import { resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
console.log("TEST:", resolve(__dirname, './src'));
