/**
 * Excel to JSON Converter for Hope Ignites Ecosystem
 *
 * This script reads the application-specs.xlsx file and converts it
 * to the proper JSON format for src/data.js
 *
 * TODO: Add CSV support as an alternative to XLSX
 * - CSV is simpler, more portable, easier to edit in any text editor
 * - No need for xlsx dependency
 * - Can use native Node.js fs module with csv-parser or papaparse
 * - Suggested implementation:
 *   1. Check for .csv file first, fall back to .xlsx
 *   2. Or add command line argument: node convert-excel.js --csv
 *   3. CSV format would be identical columns, just different file format
 */

import XLSX from 'xlsx';
import fs from 'fs';

// Read the Excel file
const workbook = XLSX.readFile('./application-specs.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const rawData = XLSX.utils.sheet_to_json(worksheet);

console.log(`📊 Found ${rawData.length} applications in spreadsheet\n`);

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
  // Handle different possible column names for ID (including space)
  const rawId = row.ID || row.id || row[' '] || row['ID'];
  const id = normalizeId(rawId);
  const category = (row.Category || 'Infrastructure').trim();
  const platform = row.Platform ? normalizeId(row.Platform) : null;

  categories.add(category);
  if (platform) platforms.add(platform);
  if (row.SSO) ssoProviders.add(normalizeId(row.SSO));

  return {
    id,
    name: row['Application Name'] || rawId || 'Unknown',
    category: category,
    description: (row.Description || '').trim(),
    tech: (row['Technology/Vendor'] || '').trim(),
    owner: (row['Owner/Team'] || '').trim(),
    platform: platform, // Parent platform (e.g., m365, salesforce)
  };
}).filter(node => node.id); // Remove any rows without an ID

// Convert to links
const links = [];

rawData.forEach(row => {
  const rawId = row.ID || row.id || row[' '] || row['ID'];
  const sourceId = normalizeId(rawId);
  if (!sourceId) return;

  const connections = parseConnections(row.Connection);
  const direction = row.Direction ? String(row.Direction).toLowerCase() : '';
  const sso = row.SSO ? normalizeId(row.SSO) : null;

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
  if (sso) {
    // Normalize m365 to entra
    const ssoTarget = (sso === 'm365' || sso === 'microsoft-365') ? 'entra' : sso;

    links.push({
      source: sourceId,
      target: ssoTarget,
      type: 'sso'
    });
  }
});

// Remove duplicate links
const uniqueLinks = [];
const linkSet = new Set();

links.forEach(link => {
  const key = `${link.source}→${link.target}→${link.type}`;
  if (!linkSet.has(key)) {
    linkSet.add(key);
    uniqueLinks.push(link);
  }
});

// Ensure Entra exists as a node (it's the SSO provider)
if (!nodes.find(n => n.id === 'entra')) {
  nodes.push({
    id: 'entra',
    name: 'Microsoft Entra ID',
    category: 'Authentication',
    description: 'Organization identity server',
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
console.log(`\n📁 Categories found: ${Array.from(categories).join(', ')}`);
console.log(`🏢 Platforms found: ${Array.from(platforms).join(', ')}`);
console.log(`🔐 SSO providers: ${Array.from(ssoProviders).join(', ')}`);

// Validate that all link targets exist as nodes
const nodeIds = new Set(nodes.map(n => n.id));
const missingNodes = new Set();

uniqueLinks.forEach(link => {
  if (!nodeIds.has(link.source)) missingNodes.add(link.source);
  if (!nodeIds.has(link.target)) missingNodes.add(link.target);
});

if (missingNodes.size > 0) {
  console.log(`\n⚠️  Warning: ${missingNodes.size} referenced nodes don't exist:`);
  console.log(`   ${Array.from(missingNodes).join(', ')}`);
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
 * AUTO-GENERATED from application-specs.xlsx
 * Generated on: ${new Date().toISOString()}
 *
 * NODES: Each node represents an application in the ecosystem
 * - id: Unique identifier (lowercase, no spaces)
 * - name: Display name shown in the diagram
 * - category: Application category
 * - description: What the application does
 * - tech: Technology stack or platform
 * - owner: Team responsible for this application
 * - platform: Parent platform/suite (e.g., m365, salesforce)
 *
 * LINKS: Each link represents a directional connection between applications
 * - source: The ID of the application that initiates the connection
 * - target: The ID of the application that receives the connection
 * - type: Connection type - 'data' or 'sso'
 *   - 'data': Functional data flow (solid arrow)
 *   - 'sso': Authentication/SSO connection (dashed arrow)
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

// Write to src/data.js
fs.writeFileSync('./src/data.js', output, 'utf-8');

console.log('\n✅ Successfully wrote to src/data.js');
console.log('\n🚀 Next steps:');
console.log('   1. Review src/data.js to verify the conversion');
console.log('   2. Run: npm run dev');
console.log('   3. Check for any missing nodes or broken connections');
