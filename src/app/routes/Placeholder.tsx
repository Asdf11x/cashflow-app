export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="container">
      <div className="h1">{title}</div>
      <p>Coming soon…</p>
    </div>
  );
}
