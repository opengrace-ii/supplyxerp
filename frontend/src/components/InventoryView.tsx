import { useMemo } from 'react';
import type { HU } from '../types';

type Props = {
  handlingUnits: HU[];
};

type LocationSlot = {
  location: string;
  hus: HU[];
  inUse: boolean;
};

export function InventoryView({ handlingUnits }: Props) {
  const slots = useMemo<LocationSlot[]>(() => {
    const grouped = new Map<string, HU[]>();
    for (const hu of handlingUnits) {
      const key = hu.location_code || 'UNASSIGNED';
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)?.push(hu);
    }
    return [...grouped.entries()]
      .map(([location, hus]) => ({
        location,
        hus: hus.sort((a, b) => a.code.localeCompare(b.code)),
        inUse: hus.some((hu) => hu.status === 'IN_TRANSIT' || hu.status === 'IN_USE'),
      }))
      .sort((a, b) => a.location.localeCompare(b.location));
  }, [handlingUnits]);

  return (
    <section className="panel inventory-panel">
      <header className="panel-header">
        <h2>Warehouse Layout</h2>
      </header>

      {slots.length === 0 ? (
        <p className="empty-state">No locations available.</p>
      ) : (
        <div className="warehouse-grid">
          {slots.map((slot) => (
            <article key={slot.location} className="location-tile">
              <div className="location-top">
                <strong>{slot.location}</strong>
                {slot.inUse ? <span className="status-badge warn">In Use</span> : <span className="status-badge ok">Ready</span>}
              </div>
              {slot.hus.length === 0 ? (
                <p className="muted">Empty</p>
              ) : (
                <ul>
                  {slot.hus.map((hu) => (
                    <li key={hu.code}>
                      <span>{hu.code}</span>
                      <span>
                        {hu.quantity} {hu.uom}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
