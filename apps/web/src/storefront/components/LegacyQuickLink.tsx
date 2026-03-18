/**
 * @fileoverview Decorated legacy quick link used inside the floating cart drawer.
 */
import { NavLink } from 'react-router-dom';

type LegacyQuickLinkProps = {
  to: string;
  label: string;
  className: string;
  onInteract: () => void;
};

export function LegacyQuickLink({ to, label, className, onInteract }: LegacyQuickLinkProps) {
  return (
    <NavLink
      to={to}
      className={`legacy-quicklink ${className}`}
      onClick={onInteract}
      onMouseEnter={onInteract}
      onFocus={onInteract}
    >
      <span className="legacy-quicklink-label">{label}</span>
      <span className="legacy-quicklink-art" aria-hidden="true" />
    </NavLink>
  );
}
