interface Detection {
    label: string;
    color: string;
    top: string;
    left: string;
    width: string;
    height: string;
}

const TrafficMonitor = () => {
    const detections: Detection[] = [
        { label: 'Bus', color: 'border-green-500 bg-green-500', top: '5%', left: '34.5%', width: '17%', height: '21%' },
        { label: 'Car', color: 'border-red-500 bg-red-500', top: '41%', left: '13.5%', width: '15%', height: '21%' },
        { label: 'Taxi', color: 'border-yellow-500 bg-yellow-500', top: '52%', left: '48.1%', width: '16.5%', height: '22%' },
        { label: 'Taxi', color: 'border-yellow-500 bg-yellow-500', top: '43%', left: '78.5%', width: '11%', height: '14%' },
        { label: 'Taxi', color: 'border-yellow-500 bg-yellow-500', top: '29%', left: '72%', width: '9%', height: '11%' },
        { label: 'Taxi', color: 'border-yellow-500 bg-yellow-500', top: '68.5%', left: '72.5%', width: '16.9%', height: '21%' },
        { label: 'People', color: 'border-pink-500 bg-pink-500', top: '23%', left: '14%', width: '10%', height: '12%' },
        { label: 'Motorcycle', color: 'border-cyan-500 bg-cyan-500', top: '44%', left: '69%', width: '6.5%', height: '13%' },
    ];

    return (
        <div className="relative w-full aspect-video bg-slate-900 rounded-3xl overflow-hidden font-sans text-white select-none">
            {/* Background Layer with Blue Tint */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-opacity"
                style={{ backgroundImage: "url('/traffic.jpg')" }}
            />
            <div className="absolute inset-0 bg-blue-900/30 mix-blend-multiply" />

            {/* Camera ID Box */}
            <div className="absolute top-6 left-6 bg-black/70 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10">
                <div className="text-gray-400 text-sm font-medium leading-none mb-1">Cam ID</div>
                <div className="text-2xl font-bold tracking-tight">07</div>
            </div>

            {/* Detection Overlays */}
            {detections.map((item, index) => (
                <div
                    key={index}
                    className={`absolute border-2 ${item.color.split(' ')[0]}`}
                    style={{ top: item.top, left: item.left, width: item.width, height: item.height }}
                >
                    <div className={`absolute -top-6 left-[-2px] px-2 py-0.5 text-xs font-bold uppercase tracking-wider ${item.color.split(' ')[1]}`}>
                        {item.label}
                    </div>
                </div>
            ))}

            {/* Bottom Status Bar */}
            <div className="absolute bottom-6 left-6 right-6 h-16 bg-black/80 backdrop-blur-lg rounded-2xl border border-white/10 flex items-center justify-between px-8">
                <div className="flex items-center gap-10">
                    <div className="flex gap-2 items-baseline">
                        <span className="text-gray-400 text-sm">Resolution:</span>
                        <span className="font-semibold tabular-nums">1920×1080</span>
                    </div>
                    <div className="flex gap-2 items-baseline">
                        <span className="text-gray-400 text-sm">FPS:</span>
                        <span className="font-semibold tabular-nums">60</span>
                    </div>
                    <div className="flex gap-2 items-baseline">
                        <span className="text-gray-400 text-sm">Latency:</span>
                        <span className="font-semibold tabular-nums">120ms</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]" />
                    <span className="font-medium tracking-wide">AI Detection Active</span>
                </div>
            </div>
        </div>
    );
};

export default TrafficMonitor;
