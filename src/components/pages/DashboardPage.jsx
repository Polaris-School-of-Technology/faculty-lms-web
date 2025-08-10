const DashboardPage = ({ user, onLogout, sessions, loading, error, onStartAttendance }) => {
    const formatDate = (dateString) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    return (
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-bold text-white">Faculty Dashboard</h1>
                    <p className="mt-1 text-lg text-gray-300">Welcome, {user.email}</p>
                </div>
                <button
                    onClick={onLogout}
                    className="py-2 px-4 border-0 rounded-md shadow-sm text-sm font-medium text-black bg-[#FFC540] hover:bg-[#e6b138] transition-colors"
                >
                    Logout
                </button>
            </header>
            <main>
                <h2 className="text-2xl font-semibold text-white mb-6">Your Upcoming Sessions</h2>
                {error && <p className="text-red-500 bg-red-900 bg-opacity-50 p-4 rounded-md mb-4">{error}</p>}
                {loading ? (
                    <p className="text-white">Loading sessions...</p>
                ) : sessions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {sessions.map((session, index) => (
                            <div key={session.id || index} className="bg-gray-900 border border-gray-800 shadow-lg rounded-lg p-6 flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl font-bold text-[#FFC540]">{session.course_name}</h3>
                                    <p className="text-sm text-gray-400 mb-4">{session.faculty_name}</p>
                                    <p className="text-gray-300"><span className="font-semibold">When:</span> {formatDate(session.session_datetime)}</p>
                                    <p className="text-gray-300"><span className="font-semibold">Venue:</span> {session.venue}</p>
                                    <p className="text-gray-300"><span className="font-semibold">Status:</span> <span className="capitalize font-medium text-yellow-400">{session.status}</span></p>
                                </div>
                                <button
                                    onClick={() => onStartAttendance(session)}
                                    className="mt-6 w-full py-2 px-4 border-0 rounded-md shadow-sm text-sm font-medium text-black bg-[#FFC540] hover:bg-[#e6b138] transition-colors"
                                >
                                    Start Attendance
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-gray-400 py-10 bg-gray-900 rounded-lg border border-gray-800">You have no upcoming sessions.</p>
                )}
            </main>
        </div>
    );
};

export default DashboardPage;
