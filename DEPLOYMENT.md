# Deployment Checklist for claudeplans.dev

This document outlines the steps to deploy the Claude Plan Viewer website to the new domain.

## ✅ Completed Updates

The following files have been updated with the new domain `claudeplans.dev`:

- [x] `package.json` - Updated homepage URL
- [x] `README.md` - Added website badge and documentation links
- [x] `CLAUDE.md` - Added website URL to project overview
- [x] `src/index.html` - Added meta tags and canonical URL
- [x] `website/docs/.vitepress/config.ts` - Updated sitemap hostname
- [x] `openapi.json` - Added claudeplans.dev as external server
- [x] `website/docs/public/openapi.json` - Synced with root OpenAPI spec

## 🚀 Deployment Steps

### 1. Update GitHub Repository Settings

Go to: https://github.com/HelgeSverre/claude-plan-viewer/settings

1. Scroll to "Website" section
2. Set website URL to: `https://claudeplans.dev`
3. Add description: "Browse, search, and read your Claude Code plans in a clean web UI"
4. Add topics (if not already added):
   - `claude`
   - `claude-code`
   - `plan-viewer`
   - `markdown`
   - `viewer`
   - `bun`
   - `react`

### 2. Configure Domain (DNS Settings)

#### If deploying to Vercel:

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Deploy from the website directory
cd website
vercel --prod

# Add custom domain in Vercel dashboard or via CLI
vercel domains add claudeplans.dev
```

**DNS Records (add these at your domain registrar):**

For Vercel:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### If deploying to Netlify:

```bash
# Install Netlify CLI if needed
npm i -g netlify-cli

# Deploy from the website/docs/.vitepress/dist directory
cd website
bun run build
netlify deploy --prod --dir docs/.vitepress/dist

# Add custom domain in Netlify dashboard
```

**DNS Records (add these at your domain registrar):**

For Netlify:
```
Type: A
Name: @
Value: 75.2.60.5

Type: CNAME
Name: www
Value: [your-site-name].netlify.app
```

#### If deploying to Cloudflare Pages:

1. Connect your GitHub repository
2. Set build command: `cd website && bun run build`
3. Set publish directory: `website/docs/.vitepress/dist`
4. Add custom domain in Cloudflare Pages dashboard

### 3. Build and Deploy Website

```bash
# From project root
cd website

# Install dependencies
bun install

# Build the website
bun run build

# Preview locally before deploying
bun run preview

# Deploy (depends on your hosting provider)
# See provider-specific commands above
```

### 4. Configure SSL/HTTPS

Most hosting providers (Vercel, Netlify, Cloudflare) automatically provision SSL certificates.

Verify HTTPS is working by visiting:
- https://claudeplans.dev
- https://www.claudeplans.dev (if using www subdomain)

### 5. Test Deployment

After deployment, verify the following:

- [ ] Homepage loads correctly
- [ ] All documentation pages are accessible
- [ ] API Reference playground works
- [ ] Search functionality works
- [ ] Dark/light theme toggle works
- [ ] Social links point to correct URLs
- [ ] Sitemap is generated: https://claudeplans.dev/sitemap.xml
- [ ] Meta tags are correct (check with View Source)
- [ ] OpenAPI spec is accessible: https://claudeplans.dev/openapi.json

### 6. Post-Deployment

1. **Update npm package** (optional):
   ```bash
   npm version patch  # or minor/major
   npm publish
   ```

2. **Create GitHub Release**:
   - Tag version matches package.json
   - Include changelog
   - Mention new website in release notes

3. **Announce** (if desired):
   - Update README on npm
   - Social media
   - Dev.to/Hashnode blog post
   - Share on relevant communities

### 7. Monitoring

Set up monitoring for:
- Uptime (UptimeRobot, Pingdom, etc.)
- Analytics (optional: Plausible, Fathom, or Google Analytics)
- Error tracking (optional: Sentry)

## 📝 Environment Variables

If deploying the actual viewer app (not just the docs), ensure these are set:

```bash
# Optional: Custom .claude directory path
CLAUDE_DIR=/path/to/.claude

# If running the server in production
PORT=3000
HOST=0.0.0.0
```

## 🔄 Continuous Deployment

### GitHub Actions Workflow (Optional)

Create `.github/workflows/deploy-website.yml`:

```yaml
name: Deploy Website

on:
  push:
    branches: [main]
    paths:
      - 'website/**'
      - 'openapi.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - name: Build website
        run: |
          cd website
          bun install
          bun run build
      # Add deployment steps for your hosting provider
```

## 🎯 Success Criteria

Deployment is complete when:

- ✅ Domain resolves to the correct IP/CNAME
- ✅ HTTPS certificate is active
- ✅ Website loads without errors
- ✅ All internal links work
- ✅ GitHub repository shows correct website URL
- ✅ Search engines can crawl the site (check robots.txt and sitemap)

## 📚 Resources

- VitePress Deployment Guide: https://vitepress.dev/guide/deploy
- Vercel Documentation: https://vercel.com/docs
- Netlify Documentation: https://docs.netlify.com
- Cloudflare Pages: https://developers.cloudflare.com/pages