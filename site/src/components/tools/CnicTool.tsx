import { useEffect, useId, useRef } from 'react';
import { getCNICInfo, validateCNIC } from 'pakdatakit/cnic';
import { checkCNICInput, formatCNICInput } from 'pakdatakit/input';
import {
  Badge,
  PrivacyNote,
  Rows,
  ShareButton,
  trackTool,
  useHashState,
} from '../widgets/common';

export default function CnicTool() {
  const id = useId();
  const [state, set] = useHashState({ cnic: '' }, false);
  const tracked = useRef(false);
  const value = state.cnic;
  const check = checkCNICInput(value);
  const valid = validateCNIC(value);
  const info = getCNICInfo(value);
  useEffect(() => {
    if (value && !tracked.current) {
      tracked.current = true;
      trackTool('cnic');
    }
  }, [value]);
  return (
    <div>
      <div className="pdk-card">
        <div className="pdk-field">
          <label htmlFor={id}>CNIC number</label>
          <input
            id={id}
            className="pdk-input mono"
            value={value}
            onChange={(e) => set({ cnic: formatCNICInput(e.target.value) })}
            placeholder="35202-1234567-1"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-describedby={`${id}-state`}
          />
        </div>
        <p id={`${id}-state`} aria-live="polite">
          {check === 'empty' ? (
            'Type or paste a 13-digit CNIC.'
          ) : check === 'incomplete' ? (
            'Keep typing…'
          ) : (
            <>
              Format:{' '}
              <Badge
                valid={valid}
                labels={['Correct format', 'Not a valid CNIC']}
              />
            </>
          )}
        </p>
        <Rows
          rows={[
            ['Formatted', info?.formatted],
            ['Province of registration', info?.province],
            ['Gender', info?.gender],
          ]}
        />
        <ShareButton state={state} personal />
      </div>
      <p className="pdk-note">
        <strong>This is not NADRA verification.</strong> It checks that the
        number is well formed and reads what the number itself encodes: the
        province where it was first registered (its first digit) and the gender
        (its last digit: odd for male, even for female). It cannot tell whether
        a CNIC exists or whose it is; only NADRA (Verisys) can.
      </p>
      <PrivacyNote />
    </div>
  );
}
