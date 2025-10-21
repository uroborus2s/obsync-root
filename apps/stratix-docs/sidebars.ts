import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * `SidebarsConfig` object.
 *
 * ## Reference
 *
 * Making a sidebar:
 *
 * - https://docusaurus.io/docs/sidebar
 *
 * Sidebar items:
 *
 * - https://docusaurus.io/docs/sidebar/items
 *
 */
const sidebars: SidebarsConfig = {
  // By default, Docusaurus generates a sidebar from the docs folder structure.
  // We are defining it manually to have a structured documentation.
  tutorialSidebar: [
    {
      type: 'category',
      label: '入门',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/installation',
        'getting-started/quick-start',
      ],
    },
    {
      type: 'category',
      label: '核心概念',
      collapsed: false,
      items: [
        'core-concepts/bootstrap-config',
        'core-concepts/controllers-routing',
        'core-concepts/dependency-injection',
        'core-concepts/lifecycle-management',
        'core-concepts/plugin-architecture',
        'core-concepts/error-handling',
        'core-concepts/cli',
      ],
    },
    {
      type: 'category',
      label: '指南',
      collapsed: true,
      items: [
        'guides/database-integration',
        'guides/authentication',
        'guides/testing',
      ],
    },
    {
      type: 'category',
      label: '插件开发',
      collapsed: true,
      items: [
        'plugin-development/introduction',
        'plugin-development/creating-a-plugin',
        'plugin-development/plugin-di',
        'plugin-development/plugin-lifecycle',
      ],
    },
    {
      type: 'category',
      label: 'API 参考',
      collapsed: true,
      items: [
        'api/decorators',
        'api/configuration',
      ],
    },
  ],
};

export default sidebars;