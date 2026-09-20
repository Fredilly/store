import { Icon } from "./Icon";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brandMark brandMarkCompact" : "brandMark"}>
      <span className="brandSymbol" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path d="M5.5 9.5 16 4l10.5 5.5v13L16 28 5.5 22.5v-13Z" />
          <path d="M6 9.8 16 15l10-5.2M16 15v13" />
          <path d="m11.5 19 2.5 2.5 5-5" />
        </svg>
      </span>
      <span>
        <strong>School Ledger</strong>
        {!compact && <small>Simple stock and sales</small>}
      </span>
    </div>
  );
}

export function WelcomeArtwork() {
  return (
    <div className="welcomeArtwork" aria-hidden="true">
      <div className="welcomeFlowCard">
        <Icon name="stockIn" size={26} />
        <span>Add an item</span>
        <b>✓</b>
      </div>
      <div className="welcomeFlowLine" />
      <div className="welcomeFlowCard">
        <Icon name="stock" size={26} />
        <span>Know your stock</span>
        <b>✓</b>
      </div>
      <div className="welcomeFlowLine" />
      <div className="welcomeFlowCard welcomeFlowCardFinal">
        <Icon name="sell" size={26} />
        <span>Record a sale</span>
      </div>
    </div>
  );
}
