/**
 * Inline busy indicator. Sized in `em` at the call site via `size` so it sits on
 * the text baseline of whatever button or label it is dropped into.
 */
export default function Spinner({ size = 15 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}
