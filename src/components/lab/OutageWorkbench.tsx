import { useState } from 'preact/hooks';
import DomainCheck from './DomainCheck';
import OutageGuide from './OutageGuide';

export default function OutageWorkbench() {
  const [domainReport, setDomainReport] = useState('');
  return <div class="outage-workbench">
    <DomainCheck onReport={setDomainReport} />
    <div class="outage-section-divider" id="outage-next-step">
      <div><span class="outage-small-label">02 / WHEN SOMETHING STILL ISN'T WORKING</span><h2>DNS is only <em>one piece.</em></h2></div>
      <p>Answer three questions. Find a safe next check, then share a brief with the DNS results you just collected.</p>
    </div>
    <OutageGuide domainReport={domainReport} />
  </div>;
}
