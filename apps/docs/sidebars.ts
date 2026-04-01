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
      ],
    },
    {
      type: 'category',
      label: 'Email Integration',
      items: [
        'email-integration/index',
        'email-integration/gmail',
      ],
    },
    'api-reference',
    'contributing',
  ],
};

export default sidebars;
