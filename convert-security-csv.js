/**
 * CSV to JSON Converter for Hope Ignites Security Ecosystem
 *
 * This script reads the security-specs.csv file and converts it
 * to the proper JSON format for src/data/security.js
 */

import fs from 'fs';

// Read the CSV file
const csvContent = fs.readFileSync('./security-specs.csv', 'utf-8');

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

console.log(`🔒 Found ${rawData.length} security components in CSV file\n`);

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

// Convert to nodes
const nodes = rawData.map(row => {
  const rawId = row.id || row[''] || row[' '];
  const id = normalizeId(rawId);

  // Skip rows without an ID or application name
  if (!id && !row['application-name']) return null;

  // Trim category and normalize whitespace
  const category = (row.category || 'Network Security').trim().replace(/\s+/g, ' ');

  categories.add(category);

  // Parse class field (primary, secondary, backup)
  const securityClass = (row.Class || row.class || '').trim().toLowerCase();

  // Parse boolean fields (TRUE/FALSE strings to actual booleans)
  const parseBool = (val) => {
    if (!val) return false;
    return String(val).toUpperCase() === 'TRUE';
  };

  return {
    id,
    name: row['application-name'] || rawId || 'Unknown',
    category: category,
    description: (row.decription || row.description || '').trim(),
    tech: (row.vendor || '').trim(),
    cloudProvider: (row['cloud-provider'] || '').trim(),
    owner: (row.owner || '').trim(),
    link: (row.link || '').trim(),
    status: (row.status || '').trim(),
    updated: (row.updated || '').trim(),
    primaryAdmin: (row['primary-admin'] || '').trim(),
    secondaryAdmin: (row['secondary-admin'] || '').trim(),
    securityClass: securityClass, // primary, secondary, or backup
    zeroTrust: parseBool(row['zero-trust'] || row['Zero Trust'] || row['Zero-Trust']), // Zero Trust enabled
    isISP: parseBool(row['isp'] || row['ISP']), // Is an Internet Service Provider
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

  // Handle regular connections
  connections.forEach(targetId => {
    if (!targetId) return;

    // Determine direction based on Direction column
    if (direction.includes('to and from') || direction === 'bidirectional') {
      // Bidirectional - create two links
      links.push({
        source: sourceId,
        target: targetId,
        type: 'security'
      });
      links.push({
        source: targetId,
        target: sourceId,
        type: 'security'
      });
    } else if (direction.includes('from')) {
      // Reverse direction: target -> source
      links.push({
        source: targetId,
        target: sourceId,
        type: 'security'
      });
    } else {
      // Default: source -> target (or "to" direction)
      links.push({
        source: sourceId,
        target: targetId,
        type: 'security'
      });
    }
  });

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
});

// Validate that all link nodes exist before adding
const nodeIds = new Set(nodes.map(n => n.id));

// Create a map of ISP nodes for quick lookup
const ispNodes = new Set(nodes.filter(n => n.isISP).map(n => n.id));

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
    // Mark as ISP connection if either source or target is an ISP
    const isISPConnection = ispNodes.has(link.source) || ispNodes.has(link.target);

    linkSet.add(key);
    uniqueLinks.push({
      ...link,
      isISPConnection // Flag for filtering in graph but showing in detail card
    });
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

// Print statistics
console.log('📈 Conversion Statistics:');
console.log(`   Security Components: ${nodes.length}`);
console.log(`   Security Links: ${uniqueLinks.length}`);
console.log(`   - Security flows: ${uniqueLinks.filter(l => l.type === 'security').length}`);
console.log(`   - Observability links: ${uniqueLinks.filter(l => l.type === 'observe').length}`);
console.log(`\n🔐 Categories found: ${Array.from(categories).join(', ')}`);

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

// Security-specific category colors
const categoryColors = {
  'Identity & Access': '#9333ea',        // Purple - Identity/Auth
  'Network Security': '#002a42',         // Indigo Blue - Network
  'Endpoint Security': '#ef7322',        // Orange - Endpoints
  'Device Management': '#0b6180',        // Ocean - Management
  'Secrets Management': '#14532d',       // Dark Green - Secrets
  'SIEM & Monitoring': '#f79d1e',        // Sun Splash - Monitoring
  'Data Protection': '#1e40af',          // Blue - Data
  'Security Awareness': '#dc2626',       // Red - Human Factor
  'DevSecOps': '#059669',                // Green - DevOps
};

const output = `/**
 * Security Ecosystem Data for Hope Ignites
 *
 * AUTO-GENERATED from security-specs.csv
 * Generated on: ${new Date().toISOString()}
 *
 * NODES: Each node represents a security component in the ecosystem
 * - id: Unique identifier (lowercase, no spaces)
 * - name: Display name shown in the diagram
 * - category: Security category
 * - description: What the component does
 * - tech: Technology vendor
 * - cloudProvider: Hosting location
 * - owner: Team responsible for this component
 * - link: URL to access the component (optional)
 * - status: Component status page URL (optional)
 * - updated: Last updated date/time (text)
 * - primaryAdmin: Primary administrator
 * - secondaryAdmin: Secondary administrator
 * - securityClass: Security classification - 'primary', 'secondary', or 'backup'
 * - zeroTrust: Whether Zero Trust security model is enabled (boolean)
 *
 * LINKS: Each link represents a directional security relationship
 * - source: The ID of the component that initiates the connection
 * - target: The ID of the component that receives the connection
 * - type: Connection type - 'security' or 'observe'
 *   - 'security': Security data flow or relationship (solid arrow)
 *   - 'observe': Monitoring/observability connection (orange dashed arrow)
 */

// Security-specific category colors
export const categoryColors = ${JSON.stringify(categoryColors, null, 2)};

// All security components in the Hope Ignites ecosystem
export const nodes = ${JSON.stringify(nodes, null, 2)};

// Security relationships between components (directional)
export const links = ${JSON.stringify(uniqueLinks, null, 2)};

// Export the complete dataset as a single object
export const securityData = {
  nodes,
  links,
  categoryColors
};

// Default export for convenience
export default securityData;
`;

// Write to src/data/security.js
fs.writeFileSync('./src/data/security.js', output, 'utf-8');

console.log('\n✅ Successfully wrote to src/data/security.js');
console.log('\n🚀 Next steps:');
console.log('   1. Review src/data/security.js to verify the conversion');
console.log('   2. Add tab switching to switch between Applications and Security views');
console.log('   3. Check for any missing nodes or broken connections');
