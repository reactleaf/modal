import type { LayerOptions, ModalState, RootOptions } from './types';

export const DEFAULT_LAYER_OPTIONS: LayerOptions = {
  closeDelay: 0,
  dim: true,
};

export const DEFAULT_ROOT_OPTIONS: Required<RootOptions> = {
  preventScroll: true,
};

export function mergeRootOptions(rootOptions?: Partial<RootOptions>): Required<RootOptions> {
  return {
    ...DEFAULT_ROOT_OPTIONS,
    ...rootOptions,
  };
}

/** Provider defaultLayerOptions + modal entry options (later wins). */
export function mergeModalLayerOptions(
  modal: ModalState,
  providerDefaults?: Partial<LayerOptions>,
): LayerOptions {
  return {
    ...DEFAULT_LAYER_OPTIONS,
    ...providerDefaults,
    ...modal.options,
  };
}

export function dimClassName(dim: LayerOptions['dim']): string | undefined {
  if (dim === true) return 'dim';
  if (typeof dim === 'string') return dim;
  return undefined;
}
