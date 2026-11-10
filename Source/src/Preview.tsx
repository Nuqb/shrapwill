import { usePreview } from './features/preview/usePreview';
import { PreviewContext } from './features/preview/context';
import { PreviewView } from './features/preview/PreviewView';
import type { Props } from './features/preview/types';
export { makeLut, opacityAt } from './features/preview/color';
export default function Preview(props: Props) {
  const state = usePreview(props);
  return (
    <PreviewContext.Provider value={state}>
      <PreviewView />
    </PreviewContext.Provider>
  );
}
