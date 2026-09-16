import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tanstackStart(),
    nitro({
      // `font-display: optional` only pays off if the second visit finds the
      // fonts already in cache and inside the window, so a revalidation
      // round-trip would quietly defeat it. The filenames are stable and carry
      // no content hash, so the policy has to be declared.
      //
      // This lives here, not in vercel.json: the `headers` key there is
      // ignored under the Build Output API that Nitro emits.
      //
      // The price of `immutable` on unhashed names: upgrading IBM Plex means
      // renaming the files by hand.
      routeRules: {
        '/fonts/**': {
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        },
      },
    }),
    viteReact(),
  ],
})

export default config
