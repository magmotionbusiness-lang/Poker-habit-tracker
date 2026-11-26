/**
 * Re-mounts on every navigation, so each screen glides in: its sections rise one after
 * another (CSS in globals.css → "Motion library"; fades only in gentle mode).
 */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
