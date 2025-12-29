import React from "react";

interface SidebarProps {
    selected: string;
    setSelected: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selected, setSelected }) => {
    const tabs = [
        { label: "Inbox", icon: "📥", key: "inbox" },
        { label: "AI Analysis", icon: "🤖", key: "analysis" },
        { label: "Google Sheets Sync", icon: "📊", key: "sheets" },
        { label: "Settings", icon: "⚙️", key: "settings" },
    ];

    return (
        <div className="w-64 bg-gray-900 text-white h-screen p-6 flex flex-col gap-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
                🧠 AI Email Assistant
            </h2>
            {tabs.map(tab => (
                <button
                    key={tab.key}
                    onClick={() => setSelected(tab.key)}
                    className={`flex items-center gap-3 p-3 rounded hover:bg-gray-700 ${selected === tab.key ? "bg-green-500 text-black" : ""
                        }`}
                >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                </button>
            ))}
        </div>
    );
};

export default Sidebar;
