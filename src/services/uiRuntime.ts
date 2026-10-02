import type { DNSDesignSystem } from '@dolomitinordicski/dns-shared-data/design-system';
import { initDNSRevealRuntime } from '@dolomitinordicski/dns-shared-data/ui/motion';
import { initDNSInteractionRuntime } from '@dolomitinordicski/dns-shared-data/ui/interaction';
import { initDNSUIPrimitives } from '@dolomitinordicski/dns-shared-data/ui/primitives';

export function initDNSUIRuntime(designSystem: DNSDesignSystem) {
  initDNSUIPrimitives();
  const interaction = initDNSInteractionRuntime({
    interaction: designSystem.interaction,
    motion: designSystem.motion,
  });

  const reveal = initDNSRevealRuntime({
    motion: designSystem.motion,
    selector: '[data-dns-reveal]',
    observeMutations: true,
  });


  return () => {
    reveal.disconnect();
    interaction.disconnect();
  };
}
