/**
 * App - Main Application Component
 *
 * Fetches all data from the Directus API on mount, then renders
 * the EcosystemDiagram with either the applications or security
 * subset of nodes and connections based on the active tab.
 */

import { useState, useEffect } from 'react';
import EcosystemDiagram from './EcosystemDiagram.jsx';

const DIRECTUS_URL = import.meta.env.VITE_DIRECTUS_URL || 'https://api.stackium.tech';

// Category → color mappings (frontend-only, not stored in Directus)
const APP_CATEGORY_COLORS = {
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

const SECURITY_CATEGORY_COLORS = {
  'Identity & Access': '#9333ea',
  'Network Security': '#002a42',
  'Endpoint Security': '#ef7322',
  'Device Management': '#0b6180',
  'Secrets Management': '#14532d',
  'SIEM & Monitoring': '#f79d1e',
  'Data Protection': '#1e40af',
  'Security Awareness': '#dc2626',
  'DevSecOps': '#059669',
};

const WEBSITE_CATEGORY_COLORS = {
  'Marketing': '#0891b2',
  'Product': '#0b6180',
  'Documentation': '#059669',
  'Campaign': '#ef7322',
  'Portal': '#1e40af',
  'Landing Page': '#f79d1e',
  'Support': '#6b7280',
  'Other': '#374151',
};

function applyBranding(branding) {
  if (!branding) return;
  if (branding.primary_color) {
    document.documentElement.style.setProperty('--color-primary', branding.primary_color);
  }
  if (branding.accent_color) {
    document.documentElement.style.setProperty('--color-accent', branding.accent_color);
  }
  if (branding.app_title) {
    document.title = branding.app_title;
  }
  if (branding.favicon_url) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = `${DIRECTUS_URL}/assets/${branding.favicon_url}`;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('applications');
  const [allApplications, setAllApplications] = useState([]);
  const [allConnections, setAllConnections] = useState([]);
  const [branding, setBranding] = useState({});
  const [platforms, setPlatforms] = useState([]);
  const [documentation, setDocumentation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [appsRes, connectionsRes, brandingRes, platformsRes, docsRes] = await Promise.all([
          fetch(`${DIRECTUS_URL}/items/applications?fields=*,platform.*,thirdPartyProvider.*,application_admins.role,application_admins.admin_id.*&limit=-1`),
          fetch(`${DIRECTUS_URL}/items/connections?limit=-1`),
          fetch(`${DIRECTUS_URL}/items/branding`),
          fetch(`${DIRECTUS_URL}/items/platforms?limit=-1`),
          fetch(`${DIRECTUS_URL}/items/documentation`),
        ]);

        if (!appsRes.ok) throw new Error(`Failed to fetch applications (${appsRes.status})`);
        if (!connectionsRes.ok) throw new Error(`Failed to fetch connections (${connectionsRes.status})`);

        if (platformsRes.ok) {
          const { data: platformsData } = await platformsRes.json();
          setPlatforms(platformsData || []);
        }

        if (docsRes.ok) {
          const { data: docsData } = await docsRes.json();
          setDocumentation(docsData);
        }

        const { data: apps } = await appsRes.json();
        const { data: connections } = await connectionsRes.json();

        // DEBUG: log raw connections to inspect actual field names
        console.log('[DEBUG] First connection raw:', JSON.stringify(connections[0], null, 2));
        console.log('[DEBUG] All connections:', JSON.stringify(connections, null, 2));

        // DEBUG: fetch application_admins directly to see junction field names
        const aaDebugRes = await fetch(`${DIRECTUS_URL}/items/application_admins?fields=*&limit=5`);
        if (aaDebugRes.ok) {
          const { data: aaDebugData } = await aaDebugRes.json();
          console.log('[DEBUG] application_admins raw items:', JSON.stringify(aaDebugData, null, 2));
        } else {
          console.log('[DEBUG] application_admins fetch failed:', aaDebugRes.status);
        }

        setAllApplications(apps);

        // Map Directus source_id/target_id → source/target expected by EcosystemDiagram
        setAllConnections(
          connections.map(c => ({
            source: c.source_id,
            target: c.target_id,
            type: c.type,
            isISPConnection: c.isISPConnection,
          }))
        );

        if (brandingRes.ok) {
          const { data: brandingData } = await brandingRes.json();
          applyBranding(brandingData);
          // Directus file fields return either a UUID string or a file object {id, ...}
          const toAssetUrl = (val) => {
            if (!val) return null;
            const id = typeof val === 'object' ? val.id : val;
            return `${DIRECTUS_URL}/assets/${id}`;
          };
          const expanded = { ...brandingData };
          if (expanded.logo_url) expanded.logo_url = toAssetUrl(expanded.logo_url);
          if (expanded.logo_dark_url) expanded.logo_dark_url = toAssetUrl(expanded.logo_dark_url);
          setBranding(expanded);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const appNodes = allApplications.filter(n => !n.is_security && !n.is_website);
  const securityNodes = allApplications.filter(n => n.is_security);
  const websiteNodes = allApplications.filter(n => n.is_website);

  const currentNodes =
    activeTab === 'applications' ? appNodes :
    activeTab === 'security' ? securityNodes :
    websiteNodes;
  const currentColors =
    activeTab === 'applications' ? APP_CATEGORY_COLORS :
    activeTab === 'security' ? SECURITY_CATEGORY_COLORS :
    WEBSITE_CATEGORY_COLORS;
  const tabName =
    activeTab === 'applications' ? 'Application' :
    activeTab === 'security' ? 'Security' :
    'Public Sites';

  // Only pass connections where both endpoints exist in the current tab's nodes
  const currentNodeIds = new Set(currentNodes.map(n => n.id));
  const currentLinks = allConnections.filter(
    c => currentNodeIds.has(c.source) && currentNodeIds.has(c.target)
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', background: '#f3f4f6' }}>
        <p style={{ fontSize: '1.125rem', color: '#374151' }}>Loading ecosystem data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'system-ui', background: '#f3f4f6' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px', padding: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', color: '#dc2626', marginBottom: '0.75rem' }}>Failed to Load Data</h1>
          <p style={{ color: '#6b7280', marginBottom: '1.25rem' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '0.5rem 1.25rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <EcosystemDiagram
      nodes={currentNodes}
      links={currentLinks}
      categoryColors={currentColors}
      tabName={tabName}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      branding={branding}
      platforms={platforms}
      documentation={documentation}
    />
  );
}
