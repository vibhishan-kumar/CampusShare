import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { 
  CreditCard, 
  Smartphone, 
  Landmark, 
  Zap, 
  CheckCircle, 
  ShieldCheck, 
  X, 
  Lock, 
  Copy, 
  Check, 
  Printer, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export default function PaymentModal({ borrowRequest, onClose, onPaymentSuccess }) {
  const [activeTab, setActiveTab] = useState('upi');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [orderData, setOrderData] = useState(null);

  // UPI State
  const [selectedUpiApp, setSelectedUpiApp] = useState('gpay');
  const [upiId, setUpiId] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrTimeLeft, setQrTimeLeft] = useState(300); // 5 mins

  // Card State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);

  // Net Banking State
  const [selectedBank, setSelectedBank] = useState('sbi');

  if (!borrowRequest) return null;

  const rentalTotal = parseFloat(borrowRequest.total_price || 0);
  const deposit = parseFloat(borrowRequest.item_deposit || 0);
  const grandTotal = rentalTotal + deposit;

  // Initialize payment order on open
  useEffect(() => {
    async function initOrder() {
      try {
        const res = await api.createPaymentOrder({ borrow_request_id: borrowRequest.id });
        if (res.success) {
          setOrderData(res.order);
        }
      } catch (err) {
        console.warn('Order initialization notice:', err.message);
      }
    }
    initOrder();
  }, [borrowRequest.id]);

  // QR Timer Countdown
  useEffect(() => {
    if (activeTab === 'upi' && qrTimeLeft > 0 && !receipt) {
      const timer = setInterval(() => setQrTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [activeTab, qrTimeLeft, receipt]);

  // Card OTP Timer Countdown
  useEffect(() => {
    if (showOtpScreen && otpTimer > 0 && !receipt) {
      const timer = setInterval(() => setOtpTimer((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [showOtpScreen, otpTimer, receipt]);

  // Copy UPI ID helper
  const handleCopyUpi = () => {
    const vpa = 'uoh.lendborrow@campus';
    navigator.clipboard?.writeText(vpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Card Number Auto-formatting
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  // Expiry Auto-formatting
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setCardExpiry(raw);
  };

  // Detect Card Brand
  const getCardBrand = () => {
    const clean = cardNumber.replace(/\s/g, '');
    if (clean.startsWith('4')) return { brand: 'VISA', color: '#1a1f71' };
    if (clean.startsWith('5')) return { brand: 'Mastercard', color: '#eb001b' };
    if (clean.startsWith('6')) return { brand: 'RuPay', color: '#097939' };
    return { brand: 'CARD', color: '#4f46e5' };
  };

  // Generic Checkout Handler
  const executePayment = async (method, metadata = {}) => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        borrow_request_id: borrowRequest.id,
        payment_method: method,
        ...metadata,
      };

      const res = await api.checkoutPayment(payload);
      if (res.success) {
        setReceipt(res.receipt);
        setShowOtpScreen(false);
        if (onPaymentSuccess) onPaymentSuccess(res);
      } else {
        setError(res.message || 'Payment processing failed.');
      }
    } catch (err) {
      setError(err.message || 'Payment failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  // UPI Payment Flow
  const handleUpiPay = () => {
    const vpa = upiId.trim() || `${selectedUpiApp}.student@uohyd.ac.in`;
    executePayment('ONLINE_UPI', {
      upi_id: vpa,
      transaction_id: `UPI-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
    });
  };

  // Card Payment Flow (Triggers 3D Secure OTP Step)
  const handleCardInitiate = (e) => {
    e.preventDefault();
    const cleanNum = cardNumber.replace(/\s/g, '');
    if (cleanNum.length < 16) {
      setError('Please enter a valid 16-digit card number.');
      return;
    }
    if (cardExpiry.length < 5) {
      setError('Please enter expiry in MM/YY format.');
      return;
    }
    if (cardCvv.length < 3) {
      setError('Please enter a valid 3-digit CVV.');
      return;
    }
    setError('');
    setShowOtpScreen(true);
    setOtpTimer(60);
    setOtpCode('');
  };

  const handleCardOtpSubmit = (e) => {
    e.preventDefault();
    if (otpCode.trim().length < 4) {
      setError('Please enter the 6-digit OTP sent to your registered number (e.g. 123456).');
      return;
    }
    const cleanNum = cardNumber.replace(/\s/g, '');
    executePayment('ONLINE_CARD', {
      card_last4: cleanNum.slice(-4),
      transaction_id: `CARD-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
    });
  };

  // Net Banking Flow
  const handleNetBankingPay = () => {
    const bankNames = {
      sbi: 'State Bank of India',
      hdfc: 'HDFC Bank',
      icici: 'ICICI Bank',
      axis: 'Axis Bank',
      pnb: 'Punjab National Bank',
      canara: 'Canara Bank',
    };
    executePayment('NETBANKING', {
      bank_name: bankNames[selectedBank] || selectedBank.toUpperCase(),
      transaction_id: `NB-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`,
    });
  };

  // Razorpay Gateway Launch
  const handleRazorpayLaunch = () => {
    const keyId = orderData?.razorpayKeyId;

    if (!keyId) {
      // Direct simulated Razorpay test payment
      executePayment('RAZORPAY', {
        razorpay_payment_id: `pay_test_${Date.now()}`,
        transaction_id: `RZP-${Date.now()}`,
      });
      return;
    }

    // Load Razorpay Checkout script dynamically if not present
    const loadScript = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) return resolve(true);
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
      });
    };

    loadScript().then((loaded) => {
      if (!loaded || !window.Razorpay) {
        setError('Failed to load Razorpay checkout script. Proceeding with instant gateway...');
        executePayment('RAZORPAY', {
          razorpay_payment_id: `pay_live_${Date.now()}`,
        });
        return;
      }

      const options = {
        key: keyId,
        amount: Math.round(grandTotal * 100),
        currency: 'INR',
        name: 'CampusShare @ UoH',
        description: `Campus rental: ${borrowRequest.item_name}`,
        image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=120',
        order_id: orderData?.orderId,
        handler: function (response) {
          executePayment('RAZORPAY', {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          });
        },
        prefill: {
          name: orderData?.borrower?.name || '',
          email: orderData?.borrower?.email || '',
          contact: orderData?.borrower?.phone || '',
        },
        theme: {
          color: '#4f46e5',
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setError(resp.error?.description || 'Razorpay payment was cancelled or failed.');
      });
      rzp.open();
    });
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const upiPayUri = `upi://pay?pa=uoh.lendborrow@campus&pn=UoH%20Lend%20and%20Borrow&am=${grandTotal.toFixed(2)}&cu=INR&tn=Borrow_Req_${borrowRequest.id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=170x170&data=${encodeURIComponent(upiPayUri)}`;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '540px', padding: '0', overflow: 'hidden', borderRadius: 'var(--radius-lg)' }}>
        
        {/* Gateway Header */}
        <div style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)', color: '#ffffff', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: '#a5b4fc', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              <Lock size={12} /> 256-Bit SSL Encrypted Campus Checkout
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ffffff', margin: '0.2rem 0 0' }}>
              {receipt ? 'Payment Confirmed' : 'Online Payment Gateway'}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#ffffff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Order Summary Ribbon */}
        <div style={{ background: '#f8fafc', padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)' }}>
              {borrowRequest.item_name}
            </div>
            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              {borrowRequest.start_date} to {borrowRequest.end_date} • Rent: ₹{rentalTotal.toFixed(2)} {deposit > 0 ? `+ Deposit: ₹${deposit.toFixed(2)}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL AMOUNT</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--primary)' }}>
              ₹{grandTotal.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem' }}>
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

          {receipt ? (
            /* ================= DIGITAL RECEIPT VIEW ================= */
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', padding: '0.85rem', background: '#ecfdf5', borderRadius: '50%', color: '#16a34a', marginBottom: '0.75rem' }}>
                <CheckCircle size={40} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                Payment Successfully Completed!
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Your item status is updated to <strong>BORROWED</strong>. Security deposit is safely held in campus escrow.
              </p>

              {/* Printable Official Receipt Box */}
              <div 
                id="printable-receipt"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  textAlign: 'left',
                  fontSize: '0.84rem',
                  marginBottom: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>CampusShare @ UoH</span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>University of Hyderabad Campus</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: '#ecfdf5', color: '#166534', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700 }}>
                    <ShieldCheck size={13} /> PAID
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Payment Reference</span>
                    <strong style={{ fontSize: '0.82rem' }}>{receipt.paymentReference}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Gateway Txn ID</span>
                    <strong style={{ fontSize: '0.82rem' }}>{receipt.gatewayTransactionId}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Payment Method</span>
                    <strong>{receipt.method}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block' }}>Date & Time</span>
                    <span>{new Date(receipt.date).toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Rental Fee:</span>
                    <span>₹{receipt.rentalFee?.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Refundable Security Deposit:</span>
                    <span>₹{receipt.securityDeposit?.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', marginTop: '0.2rem', color: 'var(--text-main)' }}>
                    <span>Total Amount Paid:</span>
                    <span style={{ color: 'var(--primary)' }}>₹{receipt.amountPaid?.toFixed(2)}</span>
                  </div>
                </div>

                {receipt.item?.ownerName && (
                  <div style={{ fontSize: '0.78rem', color: '#334155', background: '#eff6ff', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-sm)' }}>
                    <strong>Item Handover Contact:</strong> {receipt.item.ownerName} ({receipt.item.ownerHostel} - {receipt.item.ownerRoom || 'UoH Campus'}) • Phone: {receipt.item.ownerPhone || 'In-app chat'}
                  </div>
                )}
              </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  onClick={() => window.print()}
                >
                  <Printer size={16} /> Print Receipt
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ flex: 1 }}
                  onClick={onClose}
                >
                  Done & Return
                </button>
              </div>
            </div>
          ) : showOtpScreen ? (
            /* ================= 3D SECURE OTP SIMULATION ================= */
            <form onSubmit={handleCardOtpSubmit} style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0e7ff', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <Lock size={24} />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                Bank 3D-Secure Verification
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
                Please enter the one-time password (OTP) sent to your registered mobile number ending with <strong>•••• 9210</strong> to authorize payment of <strong>₹{grandTotal.toFixed(2)}</strong>.
              </p>

              <div style={{ maxWidth: '240px', margin: '0 auto 1.25rem' }}>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.3rem', letterSpacing: '6px', fontWeight: 700 }}
                  autoFocus
                  required
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {otpTimer > 0 ? (
                    <span>Resend OTP in <strong>{otpTimer}s</strong></span>
                  ) : (
                    <button type="button" onClick={() => setOtpTimer(60)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem' }}>
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                💡 <strong>Demo Testing:</strong> Enter any 6 digits (e.g. <code>123456</code>) to simulate successful bank authorization.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowOtpScreen(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={loading}
                >
                  {loading ? 'Verifying...' : `Confirm & Pay ₹${grandTotal.toFixed(2)}`}
                </button>
              </div>
            </form>
          ) : (
            /* ================= PAYMENT METHODS TABS ================= */
            <div>
              {/* Tabs Navigation */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '1.25rem', background: '#f1f5f9', padding: '0.3rem', borderRadius: 'var(--radius-md)' }}>
                {[
                  { id: 'upi', label: 'UPI / QR', icon: Smartphone },
                  { id: 'card', label: 'Card', icon: CreditCard },
                  { id: 'netbanking', label: 'NetBanking', icon: Landmark },
                  { id: 'razorpay', label: 'Razorpay', icon: Zap },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => { setActiveTab(tab.id); setError(''); }}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.2rem',
                        padding: '0.5rem 0.2rem',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: isActive ? '#ffffff' : 'transparent',
                        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                        fontWeight: isActive ? 700 : 500,
                        fontSize: '0.78rem',
                        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Icon size={16} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: UPI / QR CODE */}
              {activeTab === 'upi' && (
                <div>
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', marginBottom: '1.25rem', background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ border: '2px solid #e2e8f0', padding: '0.4rem', borderRadius: 'var(--radius-sm)', background: '#ffffff' }}>
                        <img 
                          src={qrCodeUrl} 
                          alt="UPI QR Code" 
                          style={{ width: '130px', height: '130px', display: 'block' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#b91c1c', fontWeight: 700, marginTop: '0.4rem' }}>
                        <Clock size={12} /> {formatTimer(qrTimeLeft)}
                      </div>
                    </div>

                    <div style={{ flex: 1, fontSize: '0.82rem' }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                        Scan QR with any UPI App
                      </div>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '0.75rem', lineHeight: '1.4' }}>
                        Scan using Google Pay, PhonePe, Paytm, or BHIM. Amount ₹{grandTotal.toFixed(2)} is auto-filled.
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#f8fafc', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>UPI ID:</span>
                        <strong style={{ color: 'var(--text-main)' }}>uoh.lendborrow@campus</strong>
                        <button
                          type="button"
                          onClick={handleCopyUpi}
                          style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                          title="Copy UPI ID"
                        >
                          {copiedUpi ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* UPI App Intent Shortcuts */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                      Or Pay via Installed UPI Apps:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                      {[
                        { id: 'gpay', name: 'Google Pay', color: '#ea4335' },
                        { id: 'phonepe', name: 'PhonePe', color: '#5f259f' },
                        { id: 'paytm', name: 'Paytm', color: '#00baf2' },
                        { id: 'bhim', name: 'BHIM UPI', color: '#005b94' },
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => setSelectedUpiApp(app.id)}
                          style={{
                            padding: '0.5rem 0.2rem',
                            border: `1.5px solid ${selectedUpiApp === app.id ? 'var(--primary)' : 'var(--border-color)'}`,
                            borderRadius: 'var(--radius-sm)',
                            background: selectedUpiApp === app.id ? 'var(--primary-light)' : '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          {app.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual UPI ID Input */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Enter Your UPI ID / VPA (Optional):</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. yourname@oksbi or mobile@paytm"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
                    disabled={loading}
                    onClick={handleUpiPay}
                  >
                    {loading ? 'Authorizing UPI...' : `Pay ₹${grandTotal.toFixed(2)} via UPI`}
                  </button>
                </div>
              )}

              {/* TAB 2: CREDIT / DEBIT CARDS */}
              {activeTab === 'card' && (
                <form onSubmit={handleCardInitiate}>
                  {/* Interactive Card Visual */}
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      color: '#ffffff',
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                      marginBottom: '1.25rem',
                      boxShadow: 'var(--shadow-md)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <div style={{ width: '38px', height: '28px', background: '#d97706', borderRadius: '4px', opacity: 0.85 }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, letterSpacing: '1px' }}>
                        {getCardBrand().brand}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.15rem', letterSpacing: '3px', fontFamily: 'monospace', fontWeight: 700, marginBottom: '1rem', color: '#f8fafc' }}>
                      {cardNumber || '•••• •••• •••• ••••'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8' }}>
                      <div>
                        <div style={{ fontSize: '0.62rem' }}>CARD HOLDER</div>
                        <div style={{ color: '#ffffff', fontWeight: 600 }}>{cardHolder || 'CAMPUS STUDENT'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.62rem' }}>EXPIRES</div>
                        <div style={{ color: '#ffffff', fontWeight: 600 }}>{cardExpiry || 'MM/YY'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Card Inputs */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Card Number *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="4532 0000 0000 0000"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        maxLength={19}
                        required
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.78rem' }}>Cardholder Name *</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Name printed on card"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        required
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>Expiry Date *</label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="MM/YY"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          maxLength={5}
                          required
                        />
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.78rem' }}>CVV / CVC *</label>
                        <input
                          type="password"
                          className="form-input"
                          placeholder="3 digits"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          maxLength={4}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
                  >
                    Proceed to 3D Secure Verification (₹{grandTotal.toFixed(2)})
                  </button>
                </form>
              )}

              {/* TAB 3: NET BANKING */}
              {activeTab === 'netbanking' && (
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.6rem' }}>
                    Select Your Bank:
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    {[
                      { id: 'sbi', name: 'State Bank of India', tag: 'SBI' },
                      { id: 'hdfc', name: 'HDFC Bank', tag: 'HDFC' },
                      { id: 'icici', name: 'ICICI Bank', tag: 'ICICI' },
                      { id: 'axis', name: 'Axis Bank', tag: 'AXIS' },
                      { id: 'pnb', name: 'Punjab National Bank', tag: 'PNB' },
                      { id: 'canara', name: 'Canara Bank', tag: 'CANARA' },
                    ].map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBank(b.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          border: `1.5px solid ${selectedBank === b.id ? 'var(--primary)' : 'var(--border-color)'}`,
                          background: selectedBank === b.id ? 'var(--primary-light)' : '#ffffff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: '#e2e8f0', color: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800 }}>
                          {b.tag}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: selectedBank === b.id ? 700 : 500 }}>
                          {b.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 700 }}
                    disabled={loading}
                    onClick={handleNetBankingPay}
                  >
                    {loading ? 'Connecting to Bank...' : `Pay ₹${grandTotal.toFixed(2)} via Net Banking`}
                  </button>
                </div>
              )}

              {/* TAB 4: RAZORPAY GATEWAY */}
              {activeTab === 'razorpay' && (
                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e0e7ff', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <Zap size={26} />
                  </div>
                  <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.3rem' }}>
                    Razorpay Official Gateway
                  </h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
                    Pay securely using Razorpay standard checkout supporting UPI, Credit/Debit Cards, NetBanking, and Wallets.
                  </p>

                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span>Gateway Mode:</span>
                      <strong>{orderData?.razorpayKeyId ? 'Live Razorpay API' : 'Direct Test Gateway'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Settlement Escrow:</span>
                      <strong style={{ color: '#16a34a' }}>Protected</strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                    disabled={loading}
                    onClick={handleRazorpayLaunch}
                  >
                    <Zap size={16} /> {loading ? 'Launching Gateway...' : `Launch Razorpay (₹${grandTotal.toFixed(2)})`}
                  </button>
                </div>
              )}

              {/* Escrow Guarantee Disclaimer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#166534', background: '#ecfdf5', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '1.25rem' }}>
                <ShieldCheck size={16} style={{ flexShrink: 0 }} />
                <span>
                  <strong>Campus Escrow Protection:</strong> Security deposit (₹{deposit.toFixed(2)}) is safely held in escrow and returned immediately once you return the item.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

