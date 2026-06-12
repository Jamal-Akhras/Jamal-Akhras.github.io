import { Link } from "react-router-dom";
import DecorativeBg from "./components/DecorativeBg";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 text-center text-text-primary">
      <DecorativeBg />
      <div className="relative z-10">
        <p className="font-mono text-sm tracking-[0.3em] text-accent-primary">ERROR 404</p>
        <h1 className="mt-3 text-5xl font-extrabold tracking-tight sm:text-6xl">Lost in the network</h1>
        <p className="mt-3 text-text-secondary">That route doesn't exist — there's no node here.</p>
        <div className="mt-7 flex justify-center gap-3">
          <Link to="/" className="btn-secondary">Back home</Link>
          <Link to="/projects" className="btn-tertiary">See projects</Link>
        </div>
      </div>
    </div>
  );
}
