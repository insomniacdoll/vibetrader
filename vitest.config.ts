import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            globals: true,
            // Use 'jsdom' or 'happy-dom' if you are testing React components. 
            // If you are only testing pure functions/logic, you can remove this line or set it to 'node'.
            //environment: 'jsdom', 
            include: [
                'src/**/*.{test,spec}.{ts,tsx}', 
                'tests/**/*.{test,spec}.{ts,tsx}'
            ],
            // Optional: uncomment if you need a setup file for jest-dom matchers or global mocks
            // setupFiles: './tests/setup.ts', 
        }
    })
)

