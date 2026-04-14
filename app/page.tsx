import CardForm from "./components/CardForm";
import { PlayLiveButton } from "./components/PlayLiveButton";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <CardForm />
      <div className="flex justify-center pb-12">
        <PlayLiveButton />
      </div>
    </main>
  );
}
