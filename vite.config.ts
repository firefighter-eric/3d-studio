import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules\/(three|@react-three|three-stdlib)/, priority: 10 },
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
})
