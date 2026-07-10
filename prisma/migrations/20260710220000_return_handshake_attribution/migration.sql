-- #440: honest return attribution.
-- returnInitiatedBy: who started the return (borrower = handshake, lender =
-- direct check-in), so the UI can say which path closed the loan.
-- returnMessage: the message written at return/check-in time, so it stops
-- overwriting lenderMessage (the approval-time "Your Response").

-- AlterTable
ALTER TABLE "borrow_requests"
  ADD COLUMN "returnInitiatedBy" TEXT,
  ADD COLUMN "returnMessage" TEXT;
