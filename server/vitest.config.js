import { defineConfig } from 'vitest/config'
var vitest_config_default = defineConfig({
  test: {
    include: ['src/**/*.test.js'],
    testTimeout: 1e4,
  },
})
export { vitest_config_default as default }
