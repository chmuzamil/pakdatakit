import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
  type SVGProps,
} from 'react';
import QRCode from 'qrcode';
import { createRaastP2PQr, type RaastDuration } from 'pakdatakit/raast';

/** QR error correction level: about 7%, 15%, 25% or 30% of the code can be damaged. */
export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/** Props of {@link RaastQR}. Other SVG props are passed to the `<svg>`. */
export interface RaastQRProps extends Omit<
  SVGProps<SVGSVGElement>,
  'children' | 'ref' | 'title'
> {
  /** Payee's Pakistani IBAN. Spaces and dashes are allowed. */
  iban: string;
  /** Amount in PKR. Needs `expiresIn` or `expiresAt`. */
  amount?: number | undefined;
  /** How long from now a QR with an amount works: milliseconds, or `'30m'`, `'12h'`, `'7d'`. */
  expiresIn?: number | RaastDuration | undefined;
  /** When a QR with an amount stops working. */
  expiresAt?: Date | undefined;
  /** Payment description (up to 30 characters). */
  particulars?: string | undefined;
  /** Payee's bank name (up to 25 characters). */
  bankName?: string | undefined;
  /** Scheme identifier; see `createRaastP2PQr`. */
  scheme?: '00' | '30' | undefined;
  /** Width and height of the SVG. Defaults to `256`. */
  size?: number | string | undefined;
  /** Error correction level. Defaults to `'M'`. */
  level?: QRErrorCorrectionLevel | undefined;
  /** Quiet zone around the code, in modules. Defaults to `4`. */
  margin?: number | undefined;
  /** Colour of the dark modules. Defaults to `'#000'`. */
  fgColor?: string | undefined;
  /** Background colour. Defaults to `'#fff'`; use `'transparent'` for none. */
  bgColor?: string | undefined;
  /** Accessible name of the image. Defaults to `'Raast payment QR code'`. */
  title?: string | undefined;
  /** Rendered instead of the QR when the details are invalid (e.g. a bad IBAN). */
  fallback?: ReactNode;
  /** Called with the QR payload whenever it changes. */
  onPayload?: ((payload: string) => void) | undefined;
  /** Called when the details are invalid and no QR can be made. */
  onPayloadError?: ((error: Error) => void) | undefined;
}

/** SVG path drawing the dark modules, one subpath per horizontal run. */
function modulePath(
  size: number,
  isDark: (row: number, col: number) => boolean,
  margin: number,
): string {
  let path = '';
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!isDark(row, col)) {
        col++;
        continue;
      }
      const start = col;
      while (col < size && isDark(row, col)) col++;
      path += `M${start + margin} ${row + margin}h${col - start}v1h${start - col}z`;
    }
  }
  return path;
}

/**
 * Renders a Raast person-to-person payment QR code (from `createRaastP2PQr`)
 * as an inline SVG that banking apps, Easypaisa and JazzCash can scan.
 *
 * @example
 * <RaastQR iban="PK36SCBL0000001123456702" amount={1500} expiresIn="1d" />
 */
export const RaastQR = forwardRef<SVGSVGElement, RaastQRProps>(
  function RaastQR(props, ref) {
    const {
      iban,
      amount,
      expiresIn,
      expiresAt,
      particulars,
      bankName,
      scheme,
      size = 256,
      level = 'M',
      margin = 4,
      fgColor = '#000',
      bgColor = '#fff',
      title = 'Raast payment QR code',
      fallback = null,
      onPayload,
      onPayloadError,
      ...svgProps
    } = props;

    const expiresAtTime = expiresAt?.getTime();
    const result = useMemo((): { payload: string } | { error: Error } => {
      try {
        return {
          payload: createRaastP2PQr({
            iban,
            ...(amount !== undefined && { amount }),
            ...(expiresIn !== undefined && { expiresIn }),
            ...(expiresAtTime !== undefined && {
              expiresAt: new Date(expiresAtTime),
            }),
            ...(particulars !== undefined && { particulars }),
            ...(bankName !== undefined && { bankName }),
            ...(scheme !== undefined && { scheme }),
          }),
        };
      } catch (error) {
        return {
          error: error instanceof Error ? error : new Error(String(error)),
        };
      }
    }, [iban, amount, expiresIn, expiresAtTime, particulars, bankName, scheme]);

    const payload = 'payload' in result ? result.payload : null;
    const quiet = Math.max(0, Math.floor(margin));
    const qr = useMemo(() => {
      if (payload === null) return null;
      const { modules } = QRCode.create(payload, {
        errorCorrectionLevel: level,
      });
      return {
        count: modules.size,
        path: modulePath(
          modules.size,
          (row, col) => Boolean(modules.get(row, col)),
          quiet,
        ),
      };
    }, [payload, level, quiet]);

    const callbacks = useRef({ onPayload, onPayloadError });
    useEffect(() => {
      callbacks.current = { onPayload, onPayloadError };
    });
    useEffect(() => {
      if ('payload' in result) callbacks.current.onPayload?.(result.payload);
      else callbacks.current.onPayloadError?.(result.error);
    }, [result]);

    const titleId = useId();
    if (qr === null) return <>{fallback}</>;

    const extent = qr.count + quiet * 2;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby={titleId}
        width={size}
        height={size}
        viewBox={`0 0 ${extent} ${extent}`}
        shapeRendering="crispEdges"
        data-modules={qr.count}
        {...svgProps}
        ref={ref}
      >
        <title id={titleId}>{title}</title>
        {bgColor !== 'transparent' && (
          <rect width={extent} height={extent} fill={bgColor} />
        )}
        <path d={qr.path} fill={fgColor} />
      </svg>
    );
  },
);
RaastQR.displayName = 'RaastQR';
