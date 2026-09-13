import React from 'react';
import { Clock } from 'lucide-react';

export function formatAvailableDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

export default function StatusBadge({ status, availableAfter }) {
  const normalized = (status || '').toUpperCase();

  switch (normalized) {
    case 'AVAILABLE':
      return <span className="badge badge-available">Available</span>;
    case 'BORROWED':
      return (
        <span
          className="badge badge-borrowed"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            backgroundColor: '#fffbeb',
            color: '#b45309',
            borderColor: '#fde68a',
            fontWeight: 700,
          }}
        >
          <Clock size={12} />
          {availableAfter ? `Borrowed • Available after ${formatAvailableDate(availableAfter)}` : 'Currently Borrowed'}
        </span>
      );
    case 'PENDING':
      return <span className="badge badge-pending">Pending Approval</span>;
    case 'ACCEPTED':
      return <span className="badge badge-accepted">Accepted (Pay Now)</span>;
    case 'PAYMENT':
      return <span className="badge badge-accepted">Payment Pending</span>;
    case 'RETURN_REQUESTED':
      return <span className="badge badge-pending">Return Requested</span>;
    case 'RETURNED':
      return <span className="badge badge-completed">Returned</span>;
    case 'COMPLETED':
      return <span className="badge badge-completed">Completed</span>;
    case 'REJECTED':
      return <span className="badge badge-rejected">Rejected</span>;
    case 'CANCELLED':
      return <span className="badge badge-cancelled">Cancelled</span>;
    default:
      return <span className="badge badge-cancelled">{status}</span>;
  }
}
