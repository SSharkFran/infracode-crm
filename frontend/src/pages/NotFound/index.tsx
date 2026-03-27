import { Home, SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="card max-w-xl p-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border bg-elevated text-accent-text">
          <SearchX className="h-7 w-7" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold text-text-primary">Página não encontrada</h1>
        <p className="mt-3 text-sm leading-6 text-text-secondary">A rota que você tentou acessar não existe ou foi movida durante o redesign do CRM.</p>
        <Link className="btn-primary mt-6 inline-flex" to="/">
          <Home className="h-4 w-4" />
          Voltar para o dashboard
        </Link>
      </div>
    </div>
  );
}
