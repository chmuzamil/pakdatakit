import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import { describe, expect, it, vi } from 'vitest';
import { createRaastP2PQr, parseRaastQr } from 'pakdatakit/raast';
import { RaastQR } from '../src';

const IBAN = 'PK36SCBL0000001123456702';

/** Reads the dark modules back out of the rendered SVG path. */
function readModules(svg: SVGSVGElement): boolean[][] {
  const extent = Number(svg.getAttribute('viewBox')?.split(' ')[2]);
  const grid = Array.from({ length: extent }, () =>
    Array<boolean>(extent).fill(false),
  );
  const d = svg.querySelector('path')?.getAttribute('d') ?? '';
  for (const [, x, y, w] of d.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    for (let i = 0; i < Number(w); i++) {
      grid[Number(y)]![Number(x) + i] = true;
    }
  }
  return grid;
}

/** Decodes the rendered QR by rasterising its modules and running jsQR. */
function decode(svg: SVGSVGElement): string | null {
  const grid = readModules(svg);
  const scale = 4;
  const size = grid.length * scale;
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dark = grid[Math.floor(y / scale)]![Math.floor(x / scale)];
      const offset = (y * size + x) * 4;
      const shade = dark ? 0 : 255;
      pixels[offset] = shade;
      pixels[offset + 1] = shade;
      pixels[offset + 2] = shade;
      pixels[offset + 3] = 255;
    }
  }
  return jsQR(pixels, size, size)?.data ?? null;
}

function svg(): SVGSVGElement {
  return screen.getByRole('img') as unknown as SVGSVGElement;
}

describe('RaastQR', () => {
  it('renders a scannable SVG of the createRaastP2PQr payload', () => {
    const onPayload = vi.fn();
    render(<RaastQR iban={IBAN} onPayload={onPayload} />);
    const expected = createRaastP2PQr({ iban: IBAN });

    expect(onPayload).toHaveBeenCalledTimes(1);
    expect(onPayload).toHaveBeenCalledWith(expected);
    expect(decode(svg())).toBe(expected);
  });

  it('draws exactly the modules of the QR matrix', () => {
    render(<RaastQR iban={IBAN} level="H" margin={2} />);
    const { modules } = QRCode.create(createRaastP2PQr({ iban: IBAN }), {
      errorCorrectionLevel: 'H',
    });
    const grid = readModules(svg());
    expect(grid.length).toBe(modules.size + 4);
    expect(svg().getAttribute('data-modules')).toBe(String(modules.size));
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        expect(grid[row + 2]![col + 2]).toBe(Boolean(modules.get(row, col)));
      }
    }
  });

  it('encodes amount, expiry and particulars', () => {
    const expiresAt = new Date(2030, 0, 31, 18, 30);
    const onPayload = vi.fn();
    render(
      <RaastQR
        iban="PK36 SCBL 0000 0011 2345 6702"
        amount={1500}
        expiresAt={expiresAt}
        particulars="Invoice 42"
        onPayload={onPayload}
      />,
    );
    const expected = createRaastP2PQr({
      iban: IBAN,
      amount: 1500,
      expiresAt,
      particulars: 'Invoice 42',
    });
    expect(onPayload).toHaveBeenCalledWith(expected);
    const decoded = decode(svg());
    expect(decoded).toBe(expected);
    expect(parseRaastQr(decoded!)).toMatchObject({
      iban: IBAN,
      amount: 1500,
      dynamic: true,
      particulars: 'Invoice 42',
      expiresAt: '2030-01-31T18:30',
    });
  });

  it('supports expiresIn', () => {
    const onPayload = vi.fn();
    render(
      <RaastQR
        iban={IBAN}
        amount={250.5}
        expiresIn="1d"
        onPayload={onPayload}
      />,
    );
    const payload = onPayload.mock.calls[0]?.[0] as string;
    expect(decode(svg())).toBe(payload);
    const parsed = parseRaastQr(payload);
    expect(parsed?.amount).toBe(250.5);
    expect(parsed?.expiresAt).not.toBeNull();
  });

  it('is accessible and accepts SVG props', () => {
    const ref = createRef<SVGSVGElement>();
    render(
      <RaastQR
        ref={ref}
        iban={IBAN}
        size={200}
        className="qr"
        title="Pay Ali with Raast"
        aria-describedby="qr-help"
      />,
    );
    const el = screen.getByRole('img', { name: 'Pay Ali with Raast' });
    expect(ref.current).toBe(el);
    expect(el.getAttribute('class')).toBe('qr');
    expect(el.getAttribute('width')).toBe('200');
    expect(el.getAttribute('height')).toBe('200');
    expect(el.getAttribute('aria-describedby')).toBe('qr-help');
    expect(el.querySelector('title')?.textContent).toBe('Pay Ali with Raast');
  });

  it('renders the fallback for an invalid IBAN', () => {
    const onPayload = vi.fn();
    const onPayloadError = vi.fn();
    const { container } = render(
      <RaastQR
        iban="PK00SCBL0000001123456702"
        onPayload={onPayload}
        onPayloadError={onPayloadError}
        fallback={<p>Enter a valid IBAN</p>}
      />,
    );
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText('Enter a valid IBAN')).toBeTruthy();
    expect(onPayload).not.toHaveBeenCalled();
    expect(onPayloadError).toHaveBeenCalledWith(expect.any(RangeError));
  });

  it('renders nothing without a fallback', () => {
    const { container } = render(<RaastQR iban="nope" />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing for an amount without expiry', () => {
    const { container } = render(<RaastQR iban={IBAN} amount={100} />);
    expect(container.innerHTML).toBe('');
  });

  it('does not recompute or re-report the payload on unrelated re-renders', () => {
    const onPayload = vi.fn();
    const { rerender } = render(
      <RaastQR iban={IBAN} onPayload={onPayload} className="a" />,
    );
    rerender(<RaastQR iban={IBAN} onPayload={onPayload} className="b" />);
    expect(onPayload).toHaveBeenCalledTimes(1);
    rerender(<RaastQR iban={IBAN} onPayload={onPayload} particulars="Rent" />);
    expect(onPayload).toHaveBeenCalledTimes(2);
  });

  it('can omit the background', () => {
    render(<RaastQR iban={IBAN} bgColor="transparent" fgColor="#123456" />);
    expect(svg().querySelector('rect')).toBeNull();
    expect(svg().querySelector('path')?.getAttribute('fill')).toBe('#123456');
  });
});
