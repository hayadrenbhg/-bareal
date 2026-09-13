import { LegalDocument } from '@/components/legal/LegalDocument';
import { PRIVACY_POLICY } from '@/constants/legal';

export default function PrivacyPolicyScreen() {
  return (
    <LegalDocument
      title={PRIVACY_POLICY.title}
      intro={PRIVACY_POLICY.intro}
      sections={PRIVACY_POLICY.sections}
    />
  );
}
