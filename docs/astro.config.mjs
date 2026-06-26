import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://joshtune.github.io',
  base: '/mx-workflow',
  integrations: [
    starlight({
      title: 'mx-workflow',
      description:
        'Development workflow plugin with commands and agents for the full dev lifecycle.',
      editLink: {
        baseUrl:
          'https://github.com/joshtune/mx-workflow/edit/main/docs/',
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/joshtune/mx-workflow',
        },
      ],
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          slug: 'getting-started',
        },
        {
          label: 'Commands',
          items: [
            { label: 'Review (start here)', slug: 'commands/review' },
            { label: 'Session & Discovery', slug: 'commands/session-discovery' },
            { label: 'Implementation', slug: 'commands/implementation' },
            { label: 'Multi-Agent', slug: 'commands/multi-agent' },
            { label: 'Planning & Design', slug: 'commands/planning-design' },
            { label: 'Release', slug: 'commands/release' },
          ],
        },
        {
          label: 'Agents',
          items: [
            { label: 'Agent Catalog', slug: 'agents/catalog' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Choosing a Workflow', slug: 'guides/choosing-a-workflow' },
            { label: 'First Session', slug: 'guides/first-session' },
            { label: 'Multi-Agent Team', slug: 'guides/multi-agent-team' },
            { label: 'E2E Testing', slug: 'guides/e2e-testing' },
            { label: 'Slack Bot (Headless Builds)', slug: 'guides/slack-bot' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Configuration', slug: 'reference/configuration' },
            { label: 'Scope Mappings', slug: 'reference/scope-mappings' },
            { label: 'Troubleshooting', slug: 'reference/troubleshooting' },
            { label: 'Changelog', slug: 'reference/changelog' },
          ],
        },
      ],
    }),
  ],
});
