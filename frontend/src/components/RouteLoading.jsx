function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "40vh",
        display: "grid",
        placeItems: "center",
        color: "inherit",
        padding: "24px",
      }}
    >
      <span>Loading your SkillBridge workspace…</span>
    </div>
  );
}

export default RouteLoading;
