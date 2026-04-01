import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'JobTopBob Docs',
  tagline: 'Open-source job application management',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.jobtopbob.com',
  baseUrl: '/',

  organizationName: 'jobtopbob',
  projectName: 'jobtopbob',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/jobtopbob/jobtopbob/tree/main/apps/docs/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'JobTopBob',
      logo: {
        alt: 'JobTopBob Logo',
        src: 'img/logo-light.png',
        srcDark: 'img/logo-dark.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/jobtopbob/jobtopbob',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            { label: 'Getting Started', to: '/' },
            { label: 'Self-Hosting', to: '/self-hosting' },
            { label: 'Features', to: '/features/' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/jobtopbob/jobtopbob' },
            { label: 'Discussions', href: 'https://github.com/jobtopbob/jobtopbob/discussions' },
            { label: 'Contributing', to: '/contributing' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} JobTopBob. Licensed under AGPL-3.0.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'yaml', 'go'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
