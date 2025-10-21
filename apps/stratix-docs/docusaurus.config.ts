import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: '思齐框架',
  tagline: '一个轻量、现代且功能强大的 Node.js 应用框架',
  favicon: 'img/favicon.png',

  future: {
    v4: true
  },

  url: 'https://stratix.dev', // 替换为您的实际域名
  baseUrl: '/',

  organizationName: 'your-org', // 替换为您的 GitHub 组织名
  projectName: 'stratix', // 替换为您的 GitHub 仓库名

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans']
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/your-org/stratix/tree/main/apps/stratix-docs/' // 替换为您的仓库编辑链接
        },
        blog: {
          showReadingTime: true,
          editUrl:
            'https://github.com/your-org/stratix/tree/main/apps/stratix-docs/' // 替换为您的仓库编辑链接
        },
        theme: {
          customCss: './src/css/custom.css'
        }
      } satisfies Preset.Options
    ]
  ],

  themeConfig: {
    image: 'img/social-card.jpg', // 替换为您的社交媒体预览图
    colorMode: {
      respectPrefersColorScheme: true
    },
    navbar: {
      title: '思齐框架',
      logo: {
        alt: '思齐框架 Logo',
        src: 'img/logo.png'
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '文档'
        },
        { to: '/blog', label: '博客', position: 'left' },
        {
          href: 'https://github.com/uroborus2s/obsync-root', // 替换为您的 GitHub 仓库链接
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '文档',
          items: [
            {
              label: '入门',
              to: '/docs/getting-started/introduction'
            },
            {
              label: '核心概念',
              to: '/docs/core-concepts/bootstrap-config'
            }
          ]
        },
        {
          title: '更多',
          items: [
            {
              label: '博客',
              to: '/blog'
            },
            {
              label: 'GitHub',
              href: 'https://github.com/uroborus2s/obsync-root' // 替换为您的 GitHub 仓库链接
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} 思齐框架. Built with stratix.`
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula
    }
  } satisfies Preset.ThemeConfig
};

export default config;
