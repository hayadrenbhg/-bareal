import { LegalDocument } from '@/components/legal/LegalDocument';
import { TERMS_OF_SERVICE } from '@/constants/legal';

export default function TermsOfServiceScreen() {
  return (
    <LegalDocument
      title={TERMS_OF_SERVICE.title}
      intro={TERMS_OF_SERVICE.intro}
      sections={TERMS_OF_SERVICE.sections}
    />
  );
}
