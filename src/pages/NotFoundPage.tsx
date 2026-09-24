import { Link } from '../router';

export function NotFoundPage() {
  return (
    <div>
      <h1 data-page-heading tabIndex={-1}>
        File not found
      </h1>
      <p>There is no case file at this address.</p>
      <Link to="/cases">Go to the case directory</Link>
    </div>
  );
}
