import React from "react";
import ReactPaginate from "react-paginate";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

const Pagination = ({ pageCount, onPageChange, currentPage, isLoading }) => {
  if (!pageCount || pageCount <= 1) return null;

  return (
    <div className="d-flex justify-content-center align-items-center mt-3 gap-3">
      {/* First button */}
      <button
        onClick={() => onPageChange({ selected: 0 })}
        disabled={currentPage === 0 || isLoading}
        className="btn btn-outline-primary rounded shadow-sm"
      >
        <ChevronsLeft size={18} />
      </button>

      {/* ReactPaginate component */}
      <ReactPaginate
        breakLabel="..."
        nextLabel={<ChevronRight size={18} />}
        previousLabel={<ChevronLeft size={18} />}
        onPageChange={onPageChange}
        pageRangeDisplayed={3}
        marginPagesDisplayed={2}
        pageCount={pageCount}
        forcePage={currentPage}
        containerClassName="d-flex align-items-center gap-3"
        pageLinkClassName="btn btn-outline-primary rounded shadow-sm"
        activeLinkClassName="btn btn-primary rounded shadow-sm active"
        previousLinkClassName="btn btn-outline-primary rounded shadow-sm"
        nextLinkClassName="btn btn-outline-primary rounded shadow-sm"
        breakLinkClassName="btn btn-link text-muted px-3"
        disabledLinkClassName="disabled opacity-50 cursor-not-allowed"
        disabledClassName={isLoading ? "disabled opacity-50 cursor-not-allowed" : ""}
      />

      {/* Last button */}
      <button
        onClick={() => onPageChange({ selected: pageCount - 1 })}
        disabled={currentPage === pageCount - 1 || isLoading}
        className="btn btn-outline-primary rounded shadow-sm"
      >
        <ChevronsRight size={18} />
      </button>
    </div>
  );
};

export default React.memo(Pagination);