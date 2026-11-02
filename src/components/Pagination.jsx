import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Pagination.css';

/**
 * Reusable table pagination component with 30, 50, 100 page size options
 * and previous/next page navigation buttons.
 */
const Pagination = ({
  currentPage = 1,
  totalItems = 0,
  pageSize = 30,
  pageSizeOptions = [30, 50, 100],
  onPageChange,
  onPageSizeChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalItems <= 0) return null;

  return (
    <div className="table-pagination">
      <div className="pagination-info">
        <span className="pagination-text">
          Showing <strong>{startItem}</strong> - <strong>{endItem}</strong> of <strong>{totalItems}</strong> entries
        </span>
        <div className="pagination-size-select">
          <label htmlFor="page-size-select">Rows per page:</label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              if (onPageSizeChange) {
                onPageSizeChange(newSize);
              }
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pagination-controls">
        <button
          type="button"
          className="pagination-btn pagination-btn--prev"
          disabled={currentPage <= 1}
          onClick={() => onPageChange && onPageChange(currentPage - 1)}
          title="Previous Page"
        >
          <ChevronLeft size={16} />
          <span>Prev</span>
        </button>

        <div className="pagination-numbers">
          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="pagination-ellipsis">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`pagination-num ${p === currentPage ? 'is-active' : ''}`}
                onClick={() => onPageChange && onPageChange(p)}
              >
                {p}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          className="pagination-btn pagination-btn--next"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange && onPageChange(currentPage + 1)}
          title="Next Page"
        >
          <span>Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

