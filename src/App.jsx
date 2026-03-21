/**
 * App - Main Application Component with Tab Switching
 *
 * This component provides a tabbed interface to switch between:
 * - Applications: The full application ecosystem
 * - Security: The security-focused ecosystem
 *
 * Both tabs use the same EcosystemDiagram component but with different data.
 */

import { useState } from 'react';
import EcosystemDiagram from './EcosystemDiagram.jsx';
import * as applicationsData from './data/applications.js';
import * as securityData from './data/security.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications' or 'security'

  // Determine which data to display based on active tab
  const currentData = activeTab === 'applications' ? applicationsData : securityData;
  const tabName = activeTab === 'applications' ? 'Application' : 'Security';

  // Pass activeTab to EcosystemDiagram so it can be used for URL routing or other features
  return (
    <EcosystemDiagram
      nodes={currentData.nodes}
      links={currentData.links}
      categoryColors={currentData.categoryColors}
      tabName={tabName}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
}
