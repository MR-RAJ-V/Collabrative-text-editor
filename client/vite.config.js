import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('/firebase/')) {
            return 'firebase';
          }

          if (
            id.includes('/@tiptap/')
            || id.includes('/prosemirror-')
            || id.includes('/yjs/')
            || id.includes('/y-protocols/')
          ) {
            return 'editor';
          }

          if (id.includes('/react/') || id.includes('/react-dom/')) {
            return 'react-vendor';
          }

          if (id.includes('/socket.io-client/')) {
            return 'socket';
          }

          return 'vendor';
        },
      },
    },
  },
});
