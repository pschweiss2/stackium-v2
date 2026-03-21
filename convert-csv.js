/**
 * CSV to JSON Converter for Hope Ignites Ecosystem
 *
 * This script reads the application-specs.csv file and converts it
 * to the proper JSON format for src/data.js
 */

import fs from 'fs';

// Read the CSV file
const csvContent = fs.readFileSync('./application-specs.csv', 'utf-8');

// Simple CSV parser (handles quoted fields and commas within fields)
function parseCSV(content) {
  const lines = content.split('\n').filter(line => line.trim());

  // Parse header row
  const headerLine = lines[0].replace(/^\ufeff/, ''); // Remove BOM
  const headers = parseCSVLine(headerLine);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

// Parse a single CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

const rawData = parseCSV(csvContent);

console.log(`📊 Found ${rawData.length} rows in CSV file\n`);

// Helper function to normalize ID (lowercase, no spaces, alphanumeric + hyphens only)
function normalizeId(id) {
  if (!id) return null;
  return String(id)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper function to parse connections (handles comma-separated values)
function parseConnections(connectionStr) {
  if (!connectionStr) return [];
  return String(connectionStr)
    .split(',')
    .map(c => normalizeId(c.trim()))
    .filter(c => c);
}

// Track all unique categories for validation
const categories = new Set();
const platforms = new Set();
const ssoProviders = new Set();

// Convert to nodes
const nodes = rawData.map(row => {
  // Use the new 'id' column (no more spaces)
  const rawId = row.id || row[''] || row[' '];
  const id = normalizeId(rawId);

  // Skip rows without an ID or application name
  if (!id && !row['application-name']) return null;

  // Trim category and normalize whitespace
  const category = (row.category || 'Infrastructure').trim().replace(/\s+/g, ' ');
  const platform = row.platform ? normalizeId(row.platform) : null;

  // Parse boolean fields (TRUE/FALSE strings to actual booleans)
  const parseBool = (val) => {
    if (!val) return false;
    return String(val).toUpperCase() === 'TRUE';
  };

  categories.add(category);
  if (platform) platforms.add(platform);
  if (row['sso-provider']) ssoProviders.add(normalizeId(row['sso-provider']));

  return {
    id,
    name: row['application-name'] || rawId || 'Unknown',
    category: category,
    description: (row.decription || row.description || '').trim(), // Handle typo in CSV
    tech: (row.vendor || '').trim(),
    cloudProvider: (row['cloud-provider'] || '').trim(),
    owner: (row.owner || '').trim(),
    platform: platform, // Parent platform (e.g., m365, salesforce)
    link: (row.link || '').trim(), // Application URL/link
    status: (row.status || '').trim(), // Application status
    aiLayer: parseBool(row['ai-layer']), // AI-powered application
    dnsLayer: parseBool(row['dns-layer']), // DNS layer application
    // New SSO fields
    ssoProvider: (row['sso-provider'] || '').trim(),
    ssoProtocol: (row['sso-protocol'] || '').trim(),
    ssoScim: parseBool(row['sso-scim']),
    // New boolean fields
    allTeam: parseBool(row['all-team']),
    servicesAgreement: parseBool(row['services-agreement']),
    observed: parseBool(row['observed']),
    nhqOnly: parseBool(row['nhq-only']),
    openInternet: parseBool(row['open-internet']),
    updated: (row.updated || '').trim(), // Last updated date/time
    // Admin fields
    primaryAdmin: (row['primary-admin'] || '').trim(),
    secondaryAdmin: (row['secondary-admin'] || '').trim(),
    // New contract and support fields
    contractItem: (row['contract-item'] || '').trim(),
    thirdPartyProvider: (row['3p-provider'] || '').trim(),
    purchaseVendor: (row['purchase-vendor'] || '').trim(),
    ssoGroup: (row['sso-group'] || '').trim(),
  };
}).filter(node => node && node.id); // Remove null rows and rows without an ID

// Convert to links
const links = [];

rawData.forEach(row => {
  const rawId = row.id || row[''] || row[' '];
  const sourceId = normalizeId(rawId);
  if (!sourceId) return;

  const connections = parseConnections(row.connection);
  const direction = row.direction ? String(row.direction).toLowerCase() : '';
  const ssoProvider = row['sso-provider'] ? normalizeId(row['sso-provider']) : null;

  // Handle regular connections
  connections.forEach(targetId => {
    if (!targetId) return;

    // Determine direction based on Direction column
    if (direction.includes('to and from') || direction === 'bidirectional') {
      // Bidirectional - create two links
      links.push({
        source: sourceId,
        target: targetId,
        type: 'data'
      });
      links.push({
        source: targetId,
        target: sourceId,
        type: 'data'
      });
    } else if (direction.includes('from')) {
      // Reverse direction: target -> source
      links.push({
        source: targetId,
        target: sourceId,
        type: 'data'
      });
    } else {
      // Default: source -> target (or "to" direction)
      links.push({
        source: sourceId,
        target: targetId,
        type: 'data'
      });
    }
  });

  // Handle SSO connections
  if (ssoProvider) {
    // Normalize m365 to entra
    const ssoTarget = (ssoProvider === 'm365' || ssoProvider === 'microsoft-365') ? 'entra' : ssoProvider;

    links.push({
      source: sourceId,
      target: ssoTarget,
      type: 'sso'
    });
  }

  // Handle Observability connections
  const observeConnections = parseConnections(row.observe);
  observeConnections.forEach(targetId => {
    if (!targetId) return;

    // Observability links are directional (from observe target to source)
    links.push({
      source: targetId,
      target: sourceId,
      type: 'observe'
    });
  });

  // Handle Backup connections
  const backupConnections = parseConnections(row.backup);
  backupConnections.forEach(targetId => {
    if (!targetId) return;

    // Backup links are directional (from source to backup target)
    links.push({
      source: sourceId,
      target: targetId,
      type: 'backup'
    });
  });
});

// Validate that all link nodes exist before adding
const nodeIds = new Set(nodes.map(n => n.id));

// Remove duplicate links and filter out broken references
const uniqueLinks = [];
const linkSet = new Set();
const brokenLinks = [];

links.forEach(link => {
  const key = `${link.source}→${link.target}→${link.type}`;

  // Check if both source and target nodes exist
  const sourceExists = nodeIds.has(link.source);
  const targetExists = nodeIds.has(link.target);

  if (sourceExists && targetExists && !linkSet.has(key)) {
    linkSet.add(key);
    uniqueLinks.push(link);
  } else if (!sourceExists || !targetExists) {
    // Track broken links with details
    brokenLinks.push({
      source: link.source,
      target: link.target,
      type: link.type,
      sourceExists,
      targetExists
    });
  }
});

// Ensure Entra exists as a node (it's the SSO provider)
if (!nodes.find(n => n.id === 'entra')) {
  nodes.push({
    id: 'entra',
    name: 'Microsoft Entra ID',
    category: 'Infrastructure',
    description: 'Organization Identity Server',
    tech: 'Microsoft',
    owner: 'Technology Services',
    platform: null,
  });
}

// Print statistics
console.log('📈 Conversion Statistics:');
console.log(`   Nodes: ${nodes.length}`);
console.log(`   Links: ${uniqueLinks.length}`);
console.log(`   - Data links: ${uniqueLinks.filter(l => l.type === 'data').length}`);
console.log(`   - SSO links: ${uniqueLinks.filter(l => l.type === 'sso').length}`);
console.log(`   - Observability links: ${uniqueLinks.filter(l => l.type === 'observe').length}`);
console.log(`   - Backup links: ${uniqueLinks.filter(l => l.type === 'backup').length}`);
console.log(`\n📁 Categories found: ${Array.from(categories).join(', ')}`);
console.log(`🏢 Platforms found: ${Array.from(platforms).join(', ')}`);
console.log(`🔐 SSO providers: ${Array.from(ssoProviders).join(', ')}`);

// Report broken links with details
if (brokenLinks.length > 0) {
  console.log(`\n⚠️  Found ${brokenLinks.length} broken link(s):\n`);

  brokenLinks.forEach((link, index) => {
    console.log(`   ${index + 1}. ${link.source} → ${link.target} (${link.type})`);

    if (!link.sourceExists) {
      console.log(`      ❌ Source node "${link.source}" does not exist`);
    }
    if (!link.targetExists) {
      console.log(`      ❌ Target node "${link.target}" does not exist`);
    }
  });

  console.log(`\n💡 Fix suggestions:`);
  console.log(`   - Check spelling in the CSV "connection" column`);
  console.log(`   - Verify the node ID exists in the "id" column`);
  console.log(`   - Make sure IDs use lowercase and hyphens (auto-normalized)`);
  console.log(`   - Available node IDs: ${Array.from(nodeIds).sort().join(', ')}`);
}

// Generate the data.js content
const categoryColors = {
  'Customer': '#ef7322',
  'Finance': '#0b6180',
  'Infrastructure': '#002a42',
  'Data': '#f79d1e',
  'Authentication': '#9333ea',
  'Main Line': '#0b6180',
  'Fundraising': '#ef7322',
  'Collaboration': '#002a42',
  'Training': '#f79d1e',
  'Experiential Learning': '#f79d1e',
  'DevOps': '#002a42',
  'TechOps': '#002a42',
  'Observability': '#002a42',
  'Cold Storage': '#f79d1e',
  'Automation': '#002a42',
  'MarComm': '#ef7322',
  'Payroll, Finance & Accounting': '#0b6180',
};

const output = `/**
 * Application Ecosystem Data for Hope Ignites
 *
 * AUTO-GENERATED from application-specs.csv
 * Generated on: ${new Date().toISOString()}
 *
 * NODES: Each node represents an application in the ecosystem
 * - id: Unique identifier (lowercase, no spaces)
 * - name: Display name shown in the diagram
 * - category: Application category
 * - description: What the application does
 * - tech: Technology stack or platform (vendor)
 * - cloudProvider: Cloud provider(s) used by the application (text)
 * - owner: Team responsible for this application
 * - platform: Parent platform/suite (e.g., m365, salesforce)
 * - link: URL to access the application (optional)
 * - status: Application status page URL (optional)
 * - aiLayer: AI-powered application (boolean)
 * - dnsLayer: DNS layer application (boolean)
 * - ssoProvider: SSO provider (e.g., entra, okta)
 * - ssoProtocol: SSO protocol (e.g., SAML, OIDC, NATIVE)
 * - ssoScim: Whether SCIM provisioning is enabled (boolean)
 * - allTeam: Available to all team members (boolean)
 * - servicesAgreement: Has services agreement in place (boolean)
 * - observed: Application is monitored (boolean)
 * - nhqOnly: Only accessible from NHQ network (boolean)
 * - openInternet: Available via public internet (boolean)
 * - updated: Last updated date/time (text)
 * - primaryAdmin: Primary administrator for the application
 * - secondaryAdmin: Secondary administrator for the application
 * - contractItem: Monday.com contract item reference
 * - thirdPartyProvider: Aligned support provider
 * - purchaseVendor: Purchase vendor
 * - ssoGroup: SSO group name in Entra ID
 *
 * LINKS: Each link represents a directional connection between applications
 * - source: The ID of the application that initiates the connection
 * - target: The ID of the application that receives the connection
 * - type: Connection type - 'data', 'sso', 'observe', or 'backup'
 *   - 'data': Functional data flow (solid arrow)
 *   - 'sso': Authentication/SSO connection (purple dashed arrow)
 *   - 'observe': Observability/monitoring connection (orange dashed arrow)
 *   - 'backup': Backup/replication connection (green dashed arrow)
 */

// Hope Ignites Brand Colors - DO NOT MODIFY without approval
export const categoryColors = ${JSON.stringify(categoryColors, null, 2)};

// All applications in the Hope Ignites ecosystem
export const nodes = ${JSON.stringify(nodes, null, 2)};

// Connections between applications (directional)
export const links = ${JSON.stringify(uniqueLinks, null, 2)};

// Export the complete dataset as a single object
export const ecosystemData = {
  nodes,
  links,
  categoryColors
};

// Default export for convenience
export default ecosystemData;
`;

// Write to src/data/applications.js
fs.writeFileSync('./src/data/applications.js', output, 'utf-8');

console.log('\n✅ Successfully wrote to src/data/applications.js');
console.log('\n🚀 Next steps:');
console.log('   1. Review src/data/applications.js to verify the conversion');
console.log('   2. The dev server should auto-reload with the new data');
console.log('   3. Check for any missing nodes or broken connections');
