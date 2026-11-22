import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';

interface TabBarProps<T extends string> {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
  label?: string;
  /**
   * The id of the TabPanel these tabs switch. Each tab then points to it
   * (aria-controls) and the panel is labelled by the selected tab.
   */
  panelId?: string;
}

/** The tab id for `tab` in the TabBar that controls panel `panelId`. */
const tabId = (panelId: string, tab: string) => `${panelId}-tab-${tab}`;

/** The content a TabBar switches (WAI-ARIA tabpanel). */
export function TabPanel({
  id,
  active,
  children,
}: {
  id: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={id} aria-labelledby={tabId(id, active)}>
      {children}
    </div>
  );
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  label = 'Mode',
  panelId,
}: TabBarProps<T>) {
  const base = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys, Home and End move between tabs (WAI-ARIA tabs pattern).
  function handleKeyDown(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const next = (
      {
        ArrowRight: index === last ? 0 : index + 1,
        ArrowLeft: index === 0 ? last : index - 1,
        Home: 0,
        End: last,
      } as Record<string, number>
    )[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(tabs[next].id);
    buttons.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={label} className="pdk-pills">
      {tabs.map(({ id, label: tabLabel }, index) => {
        const selected = active === id;
        return (
          <button
            key={id}
            ref={(el) => {
              buttons.current[index] = el;
            }}
            type="button"
            role="tab"
            id={tabId(panelId ?? base, id)}
            aria-controls={panelId}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className="pdk-pill"
          >
            {tabLabel}
          </button>
        );
      })}
    </div>
  );
}
