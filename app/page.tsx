import Link from "next/link";

export default function Home() {
  return (
    <div>
      <p>
        Sign up, set what you can do (push/shovel/tow), and get notified when
        someone nearby requests help.
      </p>
      <ul>
        <li>
          <Link href="/login">Login / Sign up</Link>
        </li>
        <li>
          <Link href="/dashboard">Dashboard</Link>
        </li>
      </ul>
      <details>
        <summary>Safety / expectations</summary>
        <ul>
          <li>Don’t attempt unsafe towing or anything you’re not trained for.</li>
          <li>No exact address sharing publicly—only after someone accepts.</li>
          <li>Call official services for emergencies.</li>
        </ul>
      </details>
    </div>
  );
}
