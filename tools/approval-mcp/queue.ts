/**
 * tools/approval-mcp/queue.ts
 *
 * FIFO queue for approval requests. Built as a queue from day one (R8/R12)
 * even though execution is sequential today and the queue never holds more
 * than one item — so turning on parallel execution later doesn't require
 * touching this file, only the orchestrator's execution.mode.
 */

export interface ApprovalRequest {
  id: string;
  /** Human-readable summary of what's being approved — a diff, a command, etc. */
  summary: string;
  createdAt: number;
}

export interface ApprovalResponse {
  id: string;
  approved: boolean;
  respondedAt: number;
}

type Waiter = (response: ApprovalResponse) => void;

class ApprovalQueue {
  private pending: ApprovalRequest[] = [];
  private waiters = new Map<string, Waiter>();
  private idCounter = 0;

  /** Enqueue a request and block (as a promise) until a human responds. */
  enqueueAndWait(summary: string): Promise<ApprovalResponse> {
    const id = `approval-${Date.now()}-${this.idCounter++}`;
    const request: ApprovalRequest = { id, summary, createdAt: Date.now() };
    this.pending.push(request);

    return new Promise((resolve) => {
      this.waiters.set(id, resolve);
    });
  }

  /** What a CLI/UI should currently show the human — always the front of the queue. */
  peekNext(): ApprovalRequest | undefined {
    return this.pending[0];
  }

  list(): ApprovalRequest[] {
    return [...this.pending];
  }

  /** Called once a human has answered `id`. Removes it from the queue and unblocks the waiter. */
  respond(id: string, approved: boolean): boolean {
    const index = this.pending.findIndex((r) => r.id === id);
    if (index === -1) return false;

    this.pending.splice(index, 1);
    const waiter = this.waiters.get(id);
    this.waiters.delete(id);
    waiter?.({ id, approved, respondedAt: Date.now() });
    return true;
  }
}

/** Process-wide singleton — one queue per running harness instance. */
export const approvalQueue = new ApprovalQueue();
