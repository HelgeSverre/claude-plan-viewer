#!/usr/bin/env bun
/**
 * Generates placeholder demo data for test fixtures
 * Run: bun scripts/generate-demo-data.ts
 */

import { faker } from "@faker-js/faker";

// Seed for reproducible output
faker.seed(42);

interface PlanMetadata {
  filename: string;
  filepath: string;
  title: string;
  size: number;
  modified: string;
  created: string;
  lineCount: number;
  wordCount: number;
  project: string;
  sessionId: string;
  content: string;
}

// Adjective-verb-noun pattern for filenames (like Claude's naming)
const adjectives = [
  "golden", "silver", "cosmic", "stellar", "quantum", "neural", "digital",
  "crystal", "atomic", "binary", "parallel", "dynamic", "static", "virtual",
  "abstract", "concrete", "modular", "agile", "robust", "elegant"
];

const verbs = [
  "dancing", "running", "jumping", "flying", "swimming", "walking", "coding",
  "parsing", "rendering", "compiling", "testing", "debugging", "refactoring",
  "optimizing", "deploying", "scaling", "caching", "streaming", "building"
];

const nouns = [
  "cascade", "phoenix", "dragon", "falcon", "panther", "tiger", "eagle",
  "dolphin", "nebula", "comet", "quasar", "photon", "electron", "neutron",
  "matrix", "vector", "tensor", "algorithm", "function", "module"
];

function generateFilename(): string {
  const adj = faker.helpers.arrayElement(adjectives);
  const verb = faker.helpers.arrayElement(verbs);
  const noun = faker.helpers.arrayElement(nouns);
  return `${adj}-${verb}-${noun}.md`;
}

// Sample project names (generic tech projects)
const projectNames = [
  "web-app", "api-server", "cli-tool", "mobile-app", "dashboard",
  "data-pipeline", "auth-service", "notification-system", "search-engine",
  "analytics-platform", "payment-gateway", "file-manager", "chat-app",
  "task-scheduler", "config-manager", "log-aggregator", "cache-layer"
];

// Plan title templates
const planTitleTemplates = [
  "Add {feature} to {component}",
  "Fix {issue} in {component}",
  "Refactor {component} for {goal}",
  "Implement {feature} support",
  "Update {component} configuration",
  "Migrate {component} to {technology}",
  "Optimize {component} performance",
  "Add tests for {component}",
  "Document {component} API",
  "Remove deprecated {component}"
];

const features = [
  "authentication", "caching", "logging", "metrics", "validation",
  "error handling", "rate limiting", "pagination", "sorting", "filtering",
  "search", "notifications", "webhooks", "batch processing", "async support"
];

const components = [
  "user module", "API endpoints", "database layer", "service layer",
  "middleware", "router", "controller", "repository", "event handler",
  "background worker", "CLI interface", "configuration", "test suite"
];

const technologies = [
  "TypeScript", "React", "Node.js", "PostgreSQL", "Redis", "Docker",
  "Kubernetes", "GraphQL", "REST API", "WebSocket", "gRPC"
];

const goals = [
  "better performance", "maintainability", "scalability", "testability",
  "type safety", "code clarity", "reduced complexity", "improved DX"
];

const issues = [
  "memory leak", "race condition", "timeout error", "validation bug",
  "authentication issue", "rendering glitch", "data inconsistency"
];

function generateTitle(): string {
  const template = faker.helpers.arrayElement(planTitleTemplates);
  return template
    .replace("{feature}", faker.helpers.arrayElement(features))
    .replace("{component}", faker.helpers.arrayElement(components))
    .replace("{technology}", faker.helpers.arrayElement(technologies))
    .replace("{goal}", faker.helpers.arrayElement(goals))
    .replace("{issue}", faker.helpers.arrayElement(issues));
}

function generatePlanContent(title: string): string {
  const sections = [
    `# ${title}`,
    "",
    "## Overview",
    faker.lorem.paragraph(),
    "",
    "## Goals",
    `- ${faker.lorem.sentence()}`,
    `- ${faker.lorem.sentence()}`,
    `- ${faker.lorem.sentence()}`,
    "",
    "## Implementation Plan",
    "",
    "### Step 1: Setup",
    faker.lorem.paragraph(),
    "",
    "### Step 2: Core Changes",
    faker.lorem.paragraph(),
    "",
    "```typescript",
    `function ${faker.word.verb()}${faker.word.noun().charAt(0).toUpperCase() + faker.word.noun().slice(1)}() {`,
    `  const ${faker.word.noun()} = ${faker.datatype.boolean()};`,
    `  return ${faker.word.noun()};`,
    "}",
    "```",
    "",
    "### Step 3: Testing",
    faker.lorem.paragraph(),
    "",
    "## Files to Modify",
    `- \`src/${faker.word.noun()}/${faker.word.noun()}.ts\``,
    `- \`src/${faker.word.noun()}/${faker.word.noun()}.ts\``,
    `- \`tests/${faker.word.noun()}.test.ts\``,
    "",
    "## Verification",
    `1. ${faker.lorem.sentence()}`,
    `2. ${faker.lorem.sentence()}`,
    `3. ${faker.lorem.sentence()}`,
  ];

  return sections.join("\n");
}

function generatePlan(): PlanMetadata {
  const filename = generateFilename();
  const title = generateTitle();
  const content = generatePlanContent(title);
  const lines = content.split("\n");
  const words = content.split(/\s+/).length;

  const created = faker.date.recent({ days: 90 });
  const modified = faker.date.between({ from: created, to: new Date() });

  return {
    filename,
    filepath: `/home/user/.claude/plans/${filename}`,
    title,
    size: Buffer.byteLength(content, "utf8"),
    modified: modified.toISOString(),
    created: created.toISOString(),
    lineCount: lines.length,
    wordCount: words,
    project: faker.helpers.arrayElement(projectNames),
    sessionId: faker.string.uuid(),
    content,
  };
}

// Generate 50 demo plans
const plans: PlanMetadata[] = Array.from({ length: 50 }, () => generatePlan());

// Sort by modified date descending
plans.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

// Write to fixture file
const outputPath = "test/fixtures/demo.json";
await Bun.write(outputPath, JSON.stringify(plans, null, 2));

console.log(`Generated ${plans.length} demo plans to ${outputPath}`);
console.log(`Total size: ${(Buffer.byteLength(JSON.stringify(plans), "utf8") / 1024).toFixed(1)} KB`);
