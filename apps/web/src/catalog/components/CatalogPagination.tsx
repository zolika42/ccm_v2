/**
 * @fileoverview Reusable catalog pagination control for product list navigation.
 */
type CatalogPaginationProps = {
  currentPage: number;
  totalPages: number;
  pageWindow: number[];
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export function CatalogPagination({ currentPage, totalPages, pageWindow, disabled = false, onPageChange }: CatalogPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="pagination" aria-label="Products pagination">
      <button
        type="button"
        className="pagination-button"
        disabled={disabled || currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Previous
      </button>
      {pageWindow[0] > 1 && (
        <>
          <button type="button" className="pagination-button" disabled={disabled} onClick={() => onPageChange(1)}>
            1
          </button>
          {pageWindow[0] > 2 && <span className="pagination-ellipsis">…</span>}
        </>
      )}
      {pageWindow.map((page) => (
        <button
          key={page}
          type="button"
          className={`pagination-button${page === currentPage ? ' is-active' : ''}`}
          aria-current={page === currentPage ? 'page' : undefined}
          disabled={disabled}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}
      {pageWindow[pageWindow.length - 1] < totalPages && (
        <>
          {pageWindow[pageWindow.length - 1] < totalPages - 1 && <span className="pagination-ellipsis">…</span>}
          <button type="button" className="pagination-button" disabled={disabled} onClick={() => onPageChange(totalPages)}>
            {totalPages}
          </button>
        </>
      )}
      <button
        type="button"
        className="pagination-button"
        disabled={disabled || currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </button>
    </nav>
  );
}
