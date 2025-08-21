
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface OTPVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
}

const OTPVerificationModal: React.FC<OTPVerificationModalProps> = ({ isOpen, onClose, email }) => {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithToken } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setOtp('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email) {
      setError('Email not found. Please register again.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('/api/auth/verify-otp', { email, otp });
      const { token, user } = response.data;
      loginWithToken(token, user);
      onClose(); // Close the modal on success
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred during OTP verification.');
    }
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccess('');

    if (!email) {
      setError('Email not found. Please register again.');
      return;
    }

    try {
      await axios.post('/api/auth/resend-otp', { email });
      setSuccess('A new OTP has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred while resending OTP.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700">&times;</button>
        <h2 className="text-2xl font-bold text-center mb-6">Verify Your Email</h2>
        <p className="text-center mb-4">An OTP has been sent to <strong>{email}</strong>. Please enter it below to verify your account.</p>
        <form onSubmit={handleVerifyOTP}>
          <div className="mb-4">
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">OTP</label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {success && <p className="text-green-500 text-sm mb-4">{success}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <button onClick={handleResendOTP} className="text-sm text-indigo-600 hover:underline">Didn't receive OTP? Resend</button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationModal;
