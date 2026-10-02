interface AccessibilityMountProps {
  language: 'de' | 'it';
}

export function AccessibilityMount(_props: AccessibilityMountProps) {
  return <div data-dns-accessibility-mount className="flex items-center" />;
}
