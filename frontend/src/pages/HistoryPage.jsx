import History from "../components/History.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { useApp } from "../context/AppContext.jsx";

/** Full-page view of past generations. */
export default function HistoryPage() {
  const {
    history,
    user,
    handleReplay,
    handleClearHistory,
    handleSetTags,
    handleDeleteHistory,
  } = useApp();

  return (
    <>
      <PageHeader
        title="History"
        subtitle={
          user
            ? "Synced to your account across devices."
            : "Saved locally on this device. Sign in to sync."
        }
      />
      <History
        items={history}
        onReplay={handleReplay}
        onClear={handleClearHistory}
        onSetTags={handleSetTags}
        onDelete={handleDeleteHistory}
      />
    </>
  );
}
