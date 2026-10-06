import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                academic: new URL('./index.html', import.meta.url).pathname,
                research: new URL('./research.html', import.meta.url).pathname,
                teaching: new URL('./teaching.html', import.meta.url).pathname,
                cv: new URL('./cv.html', import.meta.url).pathname,
                library: new URL('./library/index.html', import.meta.url).pathname,
                reader: new URL('./reader/index.html', import.meta.url).pathname,
            },
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
    },
});
