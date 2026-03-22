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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [appsRes, connectionsRes, brandingRes] = await Promise.all([
          fetch(`${DIRECTUS_URL}/items/applications?fields=*&limit=-1`),
          fetch(`${DIRECTUS_URL}/items/connections?limit=-1`),
          fetch(`${DIRECTUS_URL}/items/branding`),
        ]);

        if (!appsRes.ok) throw new Error(`Failed to fetch applications (${appsRes.status})`);
        if (!connectionsRes.ok) throw new Error(`Failed to fetch connections (${connectionsRes.status})`);

        const { data: apps } = await appsRes.json();
        const { data: connections } = await connectionsRes.json();

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
          const { data: branding } = await brandingRes.json();
          applyBranding(branding);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const appNodes = allApplications.filter(n => !n.is_security);
  const securityNodes = allApplications.filter(n => n.is_security);

  const currentNodes = activeTab === 'applications' ? appNodes : securityNodes;
  const currentColors = activeTab === 'applications' ? APP_CATEGORY_COLORS : SECURITY_CATEGORY_COLORS;
  const tabName = activeTab === 'applications' ? 'Application' : 'Security';

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
    />
  );
}
