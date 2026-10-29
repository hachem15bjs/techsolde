import { Boxes, CircleDashed } from 'lucide-react';
import PageHeader from './PageHeader.jsx';

export default function PlaceholderPage({ name }) {
  return (
    <>
      <PageHeader eyebrow="TEAM WORKSPACE" title={name} description={`The ${name.toLowerCase()} workspace is part of the shared TechSolde admin dashboard.`} />
      <section className="placeholder-card">
        <div className="placeholder-orbit"><span className="orbit-ring orbit-ring-one" /><span className="orbit-ring orbit-ring-two" /><span className="orbit-core"><Boxes size={27} /></span><span className="orbit-spark"><CircleDashed size={17} /></span></div>
        <span className="eyebrow">MICROSERVICE INTEGRATION</span>
        <h3>Something good is in the works.</h3>
        <p>This section is a placeholder until the team member responsible for the <strong>{name}</strong> microservice integrates its API. No demo records or fake actions are shown here.</p>
        <p className="placeholder-guide">See <strong>INTEGRATION_GUIDE.md</strong> in the repository to connect this module.</p>
        <span className="placeholder-note">Owned by another microservice · Coming soon</span>
      </section>
    </>
  );
}
