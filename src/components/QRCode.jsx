import { useState, useEffect } from 'react';

const QRCode = ({ value }) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    
    useEffect(() => {
        if (value) {
            setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(value)}`);
        }
    }, [value]);
    
    if (!value) return null;
    
    return <img src={qrCodeUrl} alt="Attendance QR Code" className="w-full h-full object-contain" />;
};

export default QRCode;
