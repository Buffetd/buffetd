# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a **Payload CMS 3.x Website Template** built with Next.js 15 (App Router), providing a full-featured content management system with a production-ready frontend. It's designed for blogs, portfolios, and content publishing platforms.

**Stack:**
- Payload CMS 3.62 (headless CMS)
- Next.js 15.4 with App Router
- React 19
- TypeScript (strict mode)
- Postgres database (@payloadcms/db-postgres)
- Tailwind CSS + shadcn/ui components
- Lexical rich text editor
- pnpm package manager

## Common Commands

### Development
```bash
pnpm dev                    # Start dev server on http://localhost:3000
pnpm build                  # Build for production (includes sitemap generation)
pnpm start                  # Run production build
pnpm dev:prod              # Clean build + production start
```

### Linting & Formatting
```bash
pnpm lint                   # Run ESLint
pnpm lint:fix              # Run ESLint with auto-fix
```

### Testing
```bash
pnpm test                   # Run all tests (integration + e2e)
pnpm test:int              # Run Vitest integration tests (tests/int/**/*.int.spec.ts)
pnpm test:e2e              # Run Playwright e2e tests (tests/e2e/**/*.e2e.spec.ts)
```

### Payload CLI
```bash
pnpm payload                        # Access Payload CLI
pnpm generate:types                # Generate TypeScript types from Payload schema
pnpm generate:importmap            # Generate import map for admin panel
pnpm payload migrate:create        # Create database migration (Postgres)
pnpm payload migrate               # Run pending migrations
```

### Database Seeding
- Access admin panel at http://localhost:3000/admin
- Click "Seed Database" button in the dashboard
- **WARNING**: Seeding is destructive and drops existing data

### Package Management
```bash
pnpm install              # Install dependencies
pnpm add <package>        # Add dependency
pnpm add -D <package>     # Add dev dependency
pnpm ii                   # Fresh install (ignoring workspace)
pnpm reinstall            # Remove node_modules and reinstall
```

## Architecture Overview

### Dual App Structure

This project runs **two Next.js apps in one instance**:

1. **Frontend** (`src/app/(frontend)/`) - Public website with SSR/SSG pages
2. **Admin Panel** (`src/app/(payload)/`) - Payload CMS admin interface

Routes are separated using Next.js route groups. The Payload admin is accessed at `/admin` while the frontend handles all other routes.

### Core Collections (CMS Content Types)

Defined in `src/collections/`:

- **Posts** - Blog posts with Lexical editor, categories, authors, hero images, and related posts
- **Pages** - Layout builder pages with flexible blocks (hero, content, media, CTA, archive, forms)
- **Media** - Uploads with automatic image optimization (Sharp), focal points, and resizing
- **Categories** - Nested taxonomy for organizing posts (uses nested-docs plugin)
- **Users** - Auth-enabled collection for admin panel access

### Blocks System (Layout Builder)

Reusable content blocks in `src/blocks/`:

- **Hero blocks** (LowImpact, MediumImpact, HighImpact, PostHero) - Configurable page headers
- **Content** - Rich text with Lexical editor
- **MediaBlock** - Images/video with captions
- **CallToAction** - Marketing CTAs with links
- **ArchiveBlock** - Auto-generated post listings with pagination
- **Form** - Dynamic forms with multiple field types (uses form-builder plugin)
- **Code** - Syntax-highlighted code blocks with copy button
- **Banner** - Inline promotional banners

**Block Rendering**: `RenderBlocks.tsx` maps block types to React components

### Globals (Shared Content)

Defined in `src/Header/` and `src/Footer/`:

- **Header** - Navigation links, logo configuration
- **Footer** - Footer links and content

These are editable in the admin panel and automatically revalidate the frontend on change.

### Plugins Configuration

Located in `src/plugins/index.ts`:

- **redirects** - Manages URL redirects (pages, posts)
- **nested-docs** - Enables nested categories
- **seo** - Meta tags, Open Graph, auto-generated titles/descriptions
- **form-builder** - Dynamic form creation with email notifications
- **search** - Full-text search for posts (uses Postgres search)
- **payload-cloud** - Deployment integration

### Access Control

Defined in `src/access/`:

- `authenticated.ts` - Only logged-in users
- `authenticatedOrPublished.ts` - Public can read published content, users can see drafts
- `anyone.ts` - Public access

Collections use these patterns to control CRUD operations.

### Draft Preview & Live Preview

- **Draft Preview**: Preview unpublished content via `/next/preview?slug=...&collection=...`
- **Live Preview**: Real-time preview while editing in admin panel
- Configured in collection configs with `generatePreviewPath()` utility

### On-Demand Revalidation

Hooks in `src/collections/*/hooks/revalidate*.ts` automatically revalidate Next.js cache when content changes:

- Publishing/updating a post → revalidates `/posts` and `/posts/[slug]`
- Changing header/footer → revalidates all pages
- Updating redirects → rebuilds redirect list

### TypeScript Types

- `src/payload-types.ts` - Auto-generated from Payload schema (run `pnpm generate:types` after schema changes)
- `src/payload.config.ts` - Main Payload configuration

### Frontend Patterns

**Data Fetching**:
- Use `getPayload()` to query CMS data server-side
- Example: `src/utilities/getDocument.ts`, `src/utilities/getGlobals.ts`

**Route Structure** (`src/app/(frontend)/`):
- `/[slug]` - Dynamic pages
- `/posts` - Blog listing
- `/posts/[slug]` - Individual post
- `/posts/page/[pageNumber]` - Paginated posts
- `/search` - Search results

**Styling**:
- Tailwind CSS with custom components in `src/components/ui/`
- shadcn/ui integration (button, input, select, etc.)
- Dark mode support via `src/providers/Theme/`

### Environment Variables

Required (copy from `.env.example`):
```bash
DATABASE_URI=postgresql://...    # Postgres connection string
PAYLOAD_SECRET=...               # JWT encryption key
NEXT_PUBLIC_SERVER_URL=...       # Base URL (no trailing slash)
CRON_SECRET=...                  # For scheduled publishing
PREVIEW_SECRET=...               # Draft preview validation
```

Optional for auto-login in development:
```bash
ADMIN_EMAIL=...
ADMIN_PASSWD=...
```

### Database Migrations

When modifying Payload collections/fields:

1. **Development**: Set `push: true` in Postgres adapter for auto-schema updates
2. **Production**: Create and run migrations:
   ```bash
   pnpm payload migrate:create    # Create migration
   pnpm payload migrate           # Run on server before starting
   ```

### Jobs & Scheduled Publishing

- Configured in `payload.config.ts` jobs section
- Enables scheduled publish/unpublish of posts/pages
- Protected by CRON_SECRET for external cron triggers (e.g., Vercel Cron)
- Access control: logged-in users or valid CRON_SECRET

## Development Workflow

1. **Schema changes**: Modify collection configs → `pnpm generate:types` → restart dev server
2. **New blocks**: Create in `src/blocks/` with `config.ts` and `Component.tsx` → add to collection
3. **Frontend changes**: Edit in `src/app/(frontend)/` → auto-reloads
4. **Admin customization**: Use `admin.components` in collections or globals
5. **Testing**: Write integration tests for API logic, e2e tests for user flows

## Important Paths

- `src/payload.config.ts` - Main CMS configuration
- `src/collections/` - Content type definitions
- `src/blocks/` - Reusable content blocks
- `src/app/(frontend)/` - Public website
- `src/app/(payload)/` - Admin panel routes
- `src/utilities/` - Helper functions (getMeUser, generateMeta, getDocument, etc.)
- `src/access/` - Access control functions
- `src/plugins/` - Plugin configurations

## Key Concepts

**Lexical Editor**: Rich text editor used in Posts and form confirmation messages. Configure features in collection field definitions.

**Admin Bar**: Visible on frontend when logged in (`@payloadcms/admin-bar`). Provides quick edit links.

**Live Preview**: Configured per-collection with breakpoints (mobile/tablet/desktop) in `payload.config.ts`.

**Sitemap Generation**: Runs post-build via `next-sitemap` (config in `next-sitemap.config.cjs`).

**Image Optimization**: Sharp processes uploads with configurable sizes in Media collection.

**Form Submissions**: Forms created in admin are rendered dynamically; submissions stored in Payload.

**Search Index**: Posts are automatically synced to search collection via `beforeSync` hook.
