import QRCode from '../QRCode';

const QrDisplayPage = ({ session, qrToken, countdown, onStop, error }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4">
            <div className="w-full max-w-4xl text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white">{session.course_name}</h1>
                <p className="text-2xl text-gray-300 mb-6">{session.faculty_name}</p>
            </div>
            
            <div className="w-full max-w-md md:max-w-lg lg:max-w-xl aspect-square bg-white p-6 rounded-lg shadow-2xl">
                {qrToken ? <QRCode value={qrToken} /> : <div className="w-full h-full flex items-center justify-center text-gray-800">Generating QR Code...</div>}
            </div>
            
            <div className="mt-6 text-center">
                {error && <p className="text-red-400 bg-red-900 bg-opacity-50 p-3 rounded-md mb-4">{error}</p>}
                <p className="text-2xl text-gray-300">QR code refreshes in: <span className="font-bold text-[#FFC540] text-3xl">{countdown}</span>s</p>
                <button
                    onClick={onStop}
                    className="mt-6 py-3 px-8 border-0 rounded-md shadow-sm text-lg font-medium text-black bg-[#FFC540] hover:bg-[#e6b138] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFC540] transition-colors"
                >
                    Stop Attendance
                </button>
            </div>
        </div>
    );
};

export default QrDisplayPage;
