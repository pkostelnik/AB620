const coursewareCommit = '941360e11dfa677914a00281a8255404e8c848e0';
const coursewareBase = `https://github.com/tertiarycourses/C1760-AB-620-Microsoft-Certified-AI-Agent-Builder-Associate/blob/${coursewareCommit}`;
const resources = [
  ['adr', 'Architecture Decision Record template', 'template', [1], 'architecture-decision-record.md'],
  ['card', 'Adaptive Card JSON fixture', 'fixture', [6], 'adaptive-card.json'],
  ['openapi', 'OpenAPI ticket tool fixture', 'fixture', [9], 'ticket-api.openapi.yaml'],
  ['kql', 'Application Insights KQL fixture', 'query', [14], 'application-insights-queries.kql'],
  ['test-set', 'Platform test-set import', 'evaluation', [15, 16], 'contoso-test-set.csv'],
  ['test-design', 'Test categories and traceability', 'evaluation', [15, 16], 'contoso-test-design.csv'],
  ['release', 'Deployment and recovery checklist', 'runbook', [19, 20], 'deployment-checklist.md'],
  ['evidence', 'Foundry evidence fixtures', 'fixture', [13], 'foundry-evidence-fixtures.json'],
].map(([id, title, type, numbers, file]) => ({ id, title, type, labs: numbers.map(n => `lab-${String(n).padStart(2, '0')}`), url: `${coursewareBase}/labs/resources/${file}` }));
