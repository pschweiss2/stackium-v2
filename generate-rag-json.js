/**
 * RAG-Ready JSON Generator for Hope Ignites Ecosystem
 *
 * This script generates a JSON file optimized for AI/RAG ingestion.
 * It exports the ecosystem data in a structured, searchable format with rich metadata.
 *
 * Usage: node generate-rag-json.js
 * Output: ecosystem-rag.json
 */

import fs from 'fs';
import { nodes, links, categoryColors } from './src/data/applications.js';

// Get the current timestamp
const generatedAt = new Date().toISOString();

// Helper function to build connection details
function buildConnectionInfo(nodeId) {
  const outgoing = links
    .filter(l => l.source === nodeId || (l.source.id && l.source.id === nodeId))
    .map(l => ({
      target: typeof l.target === 'object' ? l.target.id : l.target,
      type: l.type,
      direction: 'outgoing'
    }));

  const incoming = links
    .filter(l => l.target === nodeId || (l.target.id && l.target.id === nodeId))
    .map(l => ({
      source: typeof l.source === 'object' ? l.source.id : l.source,
      type: l.type,
      direction: 'incoming'
    }));

  return {
    outgoing,
    incoming,
    totalConnections: outgoing.length + incoming.length
  };
}

// Helper function to find related applications
function findRelatedApps(nodeId) {
  const relatedIds = new Set();

  // Find all directly connected apps
  links.forEach(link => {
    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

    if (sourceId === nodeId) {
      relatedIds.add(targetId);
    }
    if (targetId === nodeId) {
      relatedIds.add(sourceId);
    }
  });

  // Get application names for the related IDs
  return Array.from(relatedIds).map(id => {
    const node = nodes.find(n => n.id === id);
    return {
      id,
      name: node ? node.name : id,
      category: node ? node.category : 'Unknown'
    };
  });
}

// Build rich application metadata for RAG
const enrichedApplications = nodes.map(node => {
  const connections = buildConnectionInfo(node.id);
  const relatedApps = findRelatedApps(node.id);

  // Build a comprehensive text description for embedding
  const fullDescription = [
    `Application: ${node.name}`,
    node.description ? `Description: ${node.description}` : null,
    node.tech ? `Technology: ${node.tech}` : null,
    node.cloudProvider ? `Cloud Provider: ${node.cloudProvider}` : null,
    node.owner ? `Owned by: ${node.owner}` : null,
    `Category: ${node.category}`,
    node.platform ? `Part of ${node.platform} platform` : null,
    node.aiLayer ? 'AI-powered application' : null,
    node.dnsLayer ? 'DNS infrastructure layer' : null,
    node.ssoProvider ? `Uses ${node.ssoProvider} for authentication` : null,
    node.ssoProtocol ? `SSO Protocol: ${node.ssoProtocol}` : null,
    node.allTeam ? 'Available to all team members' : null,
    node.observed ? 'Application is monitored' : null,
    node.nhqOnly ? 'NHQ network access only' : null,
    node.openInternet ? 'Accessible via public internet' : null,
    connections.totalConnections > 0 ? `Connected to ${connections.totalConnections} other application(s)` : 'Standalone application',
    relatedApps.length > 0 ? `Related applications: ${relatedApps.map(a => a.name).join(', ')}` : null
  ].filter(Boolean).join('. ') + '.';

  return {
    // Core identifiers
    id: node.id,
    name: node.name,
    category: node.category,
    categoryColor: categoryColors[node.category] || '#000000',

    // Basic information
    description: node.description || '',
    technology: node.tech || '',
    cloudProvider: node.cloudProvider || '',
    owner: node.owner || '',

    // Platform and integration
    platform: node.platform || null,
    link: node.link || null,
    status: node.status || null,

    // Classification flags
    isAILayer: node.aiLayer || false,
    isDNSLayer: node.dnsLayer || false,
    isAllTeam: node.allTeam || false,
    isObserved: node.observed || false,
    isNHQOnly: node.nhqOnly || false,
    isOpenInternet: node.openInternet || false,
    hasServicesAgreement: node.servicesAgreement || false,

    // Authentication & Security
    sso: {
      provider: node.ssoProvider || null,
      protocol: node.ssoProtocol || null,
      scimEnabled: node.ssoScim || false,
      groupName: node.ssoGroup || null
    },

    // Administration
    admins: {
      primary: node.primaryAdmin || null,
      secondary: node.secondaryAdmin || null
    },

    // Contract & Vendor information
    contract: {
      contractItem: node.contractItem || null,
      thirdPartyProvider: node.thirdPartyProvider || null,
      purchaseVendor: node.purchaseVendor || null
    },

    // Metadata
    lastUpdated: node.updated || null,

    // Connection information
    connections: {
      outgoing: connections.outgoing,
      incoming: connections.incoming,
      total: connections.totalConnections,
      dataConnections: connections.outgoing.filter(c => c.type === 'data').length +
                       connections.incoming.filter(c => c.type === 'data').length,
      ssoConnections: connections.outgoing.filter(c => c.type === 'sso').length +
                      connections.incoming.filter(c => c.type === 'sso').length,
      observabilityConnections: connections.outgoing.filter(c => c.type === 'observe').length +
                                connections.incoming.filter(c => c.type === 'observe').length
    },

    // Related applications
    relatedApplications: relatedApps,

    // Full text description optimized for RAG/embedding
    fullTextDescription: fullDescription
  };
});

// Build category summaries
const categoryStats = {};
Object.keys(categoryColors).forEach(category => {
  const appsInCategory = enrichedApplications.filter(app => app.category === category);
  categoryStats[category] = {
    color: categoryColors[category],
    applicationCount: appsInCategory.length,
    applications: appsInCategory.map(app => ({
      id: app.id,
      name: app.name,
      technology: app.technology
    })),
    technologies: [...new Set(appsInCategory.map(app => app.technology).filter(Boolean))]
  };
});

// Build platform summaries
const platforms = [...new Set(nodes.map(n => n.platform).filter(Boolean))];
const platformStats = {};
platforms.forEach(platform => {
  const appsInPlatform = enrichedApplications.filter(app => app.platform === platform);
  platformStats[platform] = {
    applicationCount: appsInPlatform.length,
    applications: appsInPlatform.map(app => ({
      id: app.id,
      name: app.name
    }))
  };
});

// Build connection type summaries
const connectionStats = {
  total: links.length,
  byType: {
    data: links.filter(l => l.type === 'data').length,
    sso: links.filter(l => l.type === 'sso').length,
    observability: links.filter(l => l.type === 'observe').length
  }
};

// Build the complete RAG-ready dataset
const ragData = {
  metadata: {
    generatedAt,
    source: 'Hope Ignites Application Ecosystem',
    version: '1.0',
    description: 'Complete application ecosystem data optimized for AI/RAG ingestion',
    totalApplications: enrichedApplications.length,
    totalConnections: links.length,
    categories: Object.keys(categoryColors),
    platforms: platforms
  },

  // Main application data (enriched with all metadata)
  applications: enrichedApplications,

  // Category information
  categories: categoryStats,

  // Platform information
  platforms: platformStats,

  // Connection statistics
  connectionStats,

  // Quick lookup maps for common queries
  lookups: {
    applicationsByCategory: Object.fromEntries(
      Object.keys(categoryColors).map(cat => [
        cat,
        enrichedApplications.filter(app => app.category === cat).map(app => app.id)
      ])
    ),
    applicationsByPlatform: Object.fromEntries(
      platforms.map(platform => [
        platform,
        enrichedApplications.filter(app => app.platform === platform).map(app => app.id)
      ])
    ),
    aiApplications: enrichedApplications.filter(app => app.isAILayer).map(app => app.id),
    dnsApplications: enrichedApplications.filter(app => app.isDNSLayer).map(app => app.id),
    observedApplications: enrichedApplications.filter(app => app.isObserved).map(app => app.id),
    allTeamApplications: enrichedApplications.filter(app => app.isAllTeam).map(app => app.id),
    ssoEnabledApplications: enrichedApplications.filter(app => app.sso.provider).map(app => app.id)
  },

  // Search-optimized text index (useful for full-text search)
  searchIndex: enrichedApplications.map(app => ({
    id: app.id,
    name: app.name,
    searchText: [
      app.name,
      app.description,
      app.technology,
      app.category,
      app.owner,
      app.cloudProvider,
      app.platform,
      ...app.relatedApplications.map(r => r.name)
    ].filter(Boolean).join(' ').toLowerCase()
  }))
};

// Write the RAG-ready JSON file
const outputPath = './ecosystem-rag.json';
fs.writeFileSync(outputPath, JSON.stringify(ragData, null, 2), 'utf-8');

// Print statistics
console.log('🤖 RAG-Ready JSON Generation Complete!\n');
console.log('📊 Statistics:');
console.log(`   Total Applications: ${ragData.metadata.totalApplications}`);
console.log(`   Total Connections: ${ragData.metadata.totalConnections}`);
console.log(`   Categories: ${ragData.metadata.categories.length}`);
console.log(`   Platforms: ${ragData.metadata.platforms.length}`);
console.log(`   AI-Powered Apps: ${ragData.lookups.aiApplications.length}`);
console.log(`   SSO-Enabled Apps: ${ragData.lookups.ssoEnabledApplications.length}`);
console.log(`   Observed Apps: ${ragData.lookups.observedApplications.length}`);

console.log('\n📁 Category Distribution:');
Object.entries(categoryStats).forEach(([category, stats]) => {
  if (stats.applicationCount > 0) {
    console.log(`   ${category}: ${stats.applicationCount} apps`);
  }
});

console.log('\n🔗 Connection Types:');
console.log(`   Data connections: ${connectionStats.byType.data}`);
console.log(`   SSO connections: ${connectionStats.byType.sso}`);
console.log(`   Observability connections: ${connectionStats.byType.observability}`);

console.log(`\n✅ Successfully wrote to ${outputPath}`);
console.log('\n🚀 Use this file with:');
console.log('   • AI agents and chatbots');
console.log('   • RAG (Retrieval Augmented Generation) systems');
console.log('   • Vector databases for semantic search');
console.log('   • Documentation generators');
console.log('   • Analytics and reporting tools');
console.log('\n💡 Each application includes:');
console.log('   • Full metadata and classifications');
console.log('   • Connection details (incoming/outgoing)');
console.log('   • Related applications');
console.log('   • fullTextDescription field optimized for embeddings');
