import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'self-hosting',
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/index',
        'features/ai-setup',
        'features/email-integration',
      ],
    },
    'api-reference',
    'contributing',
  ],
};

export default sidebars;
